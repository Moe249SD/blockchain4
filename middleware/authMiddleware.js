const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    console.log("📌 محتوى الجلسة داخل middleware:", req.session); // تحقق من البيانات

    const token = req.session.token;
    if (!token) {
        console.log("❌ لا يوجد توكن، إعادة توجيه إلى تسجيل الدخول.");
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("❌ خطأ في المصادقة:", err);
            return res.redirect('/login');
        }
        req.user = decoded;
        next();
    });
};
