const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect('mongodb+srv://blockchain2:Ma2345678910@cluster0.invsc.mongodb.net/library?retryWrites=true&w=majority&appName=Cluster0')
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ تم الاتصال بقاعدة البيانات بنجاح!");
    } catch (error) {
        console.error("❌ فشل الاتصال بقاعدة البيانات:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
