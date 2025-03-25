require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Web3 } = require('web3');
const crypto = require('crypto');
const multer = require('multer');
const Grid = require('gridfs-stream');
const path = require('path');
const { GridFSBucket } = require('mongodb');
const authMiddleware = require('./middleware/authMiddleware');
const User = require('./models/User');
const contractABI = require('./contractABI.json');

const app = express();
const port = process.env.PORT || 5000;

// ✅ إعداد Web3.js
const provider = new Web3.providers.HttpProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545');
const web3 = new Web3(provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, contractAddress);

// ✅ الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Error connecting to MongoDB:', err));

// ✅ إعداد الجلسات
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ✅ إعداد محرك القوالب والملفات الثابتة
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ تهيئة GridFS
const conn = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let gfs, gridfsBucket;
conn.once('open', () => {
    gridfsBucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    console.log("✅ GridFS جاهز لتخزين الملفات");
});

// ✅ إعداد Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('❌ نوع الملف غير مسموح به!'));
        }
        cb(null, true);
    }
});

// ✅ رفع الملفات
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        req.session.error = "❌ لم يتم رفع أي ملف!";
        return res.redirect('/files');
    }

    const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;
    const uploadStream = gridfsBucket.openUploadStream(filename);
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
        req.session.message = `✅ تم رفع الملف بنجاح: ${filename}`;
        res.redirect('/files');
    });

    uploadStream.on('error', err => {
        console.error("❌ خطأ أثناء رفع الملف:", err);
        req.session.error = "❌ فشل في تخزين الملف.";
        res.redirect('/files');
    });
});

// ✅ عرض قائمة الملفات
app.get('/files', async (req, res) => {
    try {
        const files = await gfs.files.find().toArray();
        res.render('files', { files, message: req.session.message || "", error: req.session.error || "" });
        req.session.message = null;
        req.session.error = null;
    } catch (err) {
        console.error("❌ خطأ في جلب الملفات:", err);
        res.render('files', { files: [], message: "", error: "❌ فشل في جلب الملفات." });
    }
});

// ✅ عرض ملف معين
app.get('/files/:id', async (req, res) => {
    try {
        const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        if (!file) {
            return res.status(404).send("❌ الملف غير موجود!");
        }
        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (err) {
        console.error("❌ خطأ أثناء جلب الملف:", err);
        res.status(500).send("❌ حدث خطأ في جلب الملف.");
    }
});

// ✅ تنزيل ملف معين
app.get('/files/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send("❌ معرف الملف غير صالح.");
        }

        const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        if (!file) {
            return res.status(404).send("❌ الملف غير موجود!");
        }

        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (err) {
        console.error("❌ خطأ أثناء جلب الملف:", err);
        res.status(500).send("❌ حدث خطأ في جلب الملف.");
    }
});

// ✅ حذف ملف معين
app.delete('/delete/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, error: "❌ معرف الملف غير صالح." });
        }

        const fileId = new mongoose.Types.ObjectId(req.params.id);
        await gridfsBucket.delete(fileId);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ خطأ أثناء حذف الملف:", err);
        res.status(500).json({ success: false, error: "❌ فشل في حذف الملف." });
    }
});


// ✅ الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index');
});

// ✅ مسار لوحة التحكم (Dashboard)
app.get('/dashboard', (req, res) => {
    // التحقق مما إذا كان المستخدم مسجل دخول أم لا
    if (!req.session.token) {
        return res.redirect('/login'); // إعادة التوجيه إلى صفحة تسجيل الدخول
    }

    try {
        // فك تشفير التوكن والتحقق من صلاحيته
        const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);

        // تمرير بيانات المستخدم إلى القالب
        res.render('dashboard', { user: { username: req.session.username } });
    } catch (err) {
        console.error("❌ توكن غير صالح أو منتهي الصلاحية:", err);
        req.session.destroy(); // مسح الجلسة لتجنب المشاكل
        res.redirect('/login'); // إعادة توجيه المستخدم إلى تسجيل الدخول
    }
});

// ✅ عرض صفحة تسجيل الدخول
app.get('/login', (req, res) => {
    res.render('login'); // تأكد من أن لديك ملف "login.ejs" في مجلد "views"
});

// ✅ عرض صفحة التسجيل
app.get('/register', (req, res) => {
    res.render('register'); // تأكد من أن لديك ملف "register.ejs" في مجلد "views"
});

// ✅ تسجيل الدخول
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send("❌ البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        req.session.token = token;
        req.session.username = user.username;

        res.redirect('/dashboard');
    } catch (err) {
        console.error("❌ خطأ أثناء تسجيل الدخول:", err);
        res.status(500).send("❌ حدث خطأ أثناء تسجيل الدخول.");
    }
});

app.get('/download/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send("❌ معرف الملف غير صالح.");
        }

        const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        if (!file) {
            return res.status(404).send("❌ الملف غير موجود!");
        }

        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (err) {
        console.error("❌ خطأ أثناء تحميل الملف:", err);
        res.status(500).send("❌ حدث خطأ أثناء تحميل الملف.");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("❌ خطأ أثناء تسجيل الخروج:", err);
            return res.status(500).send("❌ حدث خطأ أثناء تسجيل الخروج.");
        }
        res.redirect('/login'); // ✅ إعادة التوجيه لصفحة تسجيل الدخول بعد تسجيل الخروج
    });
});


app.get('/verify/:fileHash', async (req, res) => {
    try {
        const fileHash = req.params.fileHash;
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        const document = await contract.methods.getDocument(fileHash).call();
        
        if (document.timestamp == 0) {
            return res.json({ success: false, message: "⚠️ الوثيقة غير مسجلة في البلوكشين!" });
        }

        res.json({
            success: true,
            owner: document.owner,
            timestamp: new Date(document.timestamp * 1000).toLocaleString(),
            isValid: document.isValid
        });

    } catch (error) {
        console.error("❌ خطأ أثناء التحقق من الوثيقة:", error);
        res.status(500).json({ success: false, message: "❌ حدث خطأ أثناء التحقق من الوثيقة." });
    }
});


// ✅ تشغيل السيرفر
app.listen(port, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${port}`);
});
