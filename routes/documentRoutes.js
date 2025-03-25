const express = require("express");
const router = express.Router();

// تحميل المستندات إلى البلوكشين
router.post("/upload", async (req, res) => {
    try {
        // هنا سيتم التعامل مع العقود الذكية لتخزين المستند
        res.json({ message: "تم رفع المستند بنجاح!" });
    } catch (error) {
        res.status(500).json({ error: "فشل رفع المستند" });
    }
});

module.exports = router;
