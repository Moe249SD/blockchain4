const express = require("express");
const router = express.Router();
const User = require("../models/User");

// تسجيل مستخدم جديد
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(201).json({ message: "تم التسجيل بنجاح!" });
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء التسجيل" });
    }
});

// تسجيل الدخول
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        res.json({ message: "تم تسجيل الدخول بنجاح" });
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
});

module.exports = router;
