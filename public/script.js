document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectMetaMask");
    const walletState = document.getElementById("walletState");
    const walletAddress = document.getElementById("walletAddress");
    const walletBalance = document.getElementById("walletBalance");
    const walletNetwork = document.getElementById("walletNetwork");
    const walletStatus = document.getElementById("walletStatus");

    if (!window.ethereum) {
        alert("يرجى تثبيت MetaMask لاستخدام هذه الميزة!");
        return;
    }

    async function connectWallet() {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const userAccount = accounts[0];
            walletStatus.textContent = `متصل: ${userAccount}`;
            console.log("تم الاتصال بالمحفظة:", userAccount);
        } catch (error) {
            console.error("❌ خطأ في الاتصال بالمحفظة:", error);
            alert("حدث خطأ أثناء محاولة الاتصال بمحفظتك!");
        }
    }
    connectButton.addEventListener("click", connectWallet);
});
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const fileId = event.target.getAttribute('data-id');
            if (!fileId) {
                alert("❌ معرف الملف غير موجود!");
                return;
            }

            if (confirm("هل أنت متأكد أنك تريد حذف هذا الملف؟")) {
                try {
                    const response = await fetch(`/delete/${fileId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.success) {
                        alert("✅ تم حذف الملف بنجاح!");
                        window.location.reload();
                    } else {
                        alert("❌ حدث خطأ أثناء الحذف.");
                    }
                } catch (error) {
                    console.error("❌ خطأ أثناء حذف الملف:", error);
                }
            }
        });
    });
});


document.addEventListener("DOMContentLoaded", async function () {
    const connectButton = document.getElementById("connectMetaMask");
    const uploadForm = document.querySelector("form[action='/upload']");
    
    let web3;
    let accounts = [];

    if (typeof window.ethereum !== "undefined") {
        web3 = new Web3(window.ethereum);
    } else {
        alert("❌ يرجى تثبيت MetaMask لاستخدام هذه الميزة.");
        return;
    }

    async function connectMetaMask() {
        try {
            accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            if (accounts.length > 0) {
                document.getElementById("walletAddress").innerText = `✅ متصل: ${accounts[0]}`;
                console.log("✅ تم الاتصال بالمحفظة:", accounts[0]);
            }
        } catch (error) {
            console.error("❌ خطأ في الاتصال بـ MetaMask:", error);
            alert("❌ فشل الاتصال بـ MetaMask!");
        }
    }

    async function addDocumentToBlockchain(fileHash) {
        try {
            const contract = new web3.eth.Contract(contractABI, contractAddress);
            await contract.methods.addDocument(fileHash).send({ from: accounts[0] });
            alert("✅ تم تسجيل المستند في البلوكشين!");
        } catch (error) {
            console.error("❌ خطأ أثناء تسجيل المستند:", error);
        }
    }

    uploadForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const fileInput = document.querySelector("input[type='file']");
        if (!fileInput.files.length) return alert("❌ الرجاء اختيار ملف!");

        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileHash = web3.utils.sha3(e.target.result);
            console.log("🔹 Hash للمستند:", fileHash);
            await addDocumentToBlockchain(fileHash);
            uploadForm.submit();
        };
        reader.readAsArrayBuffer(fileInput.files[0]);
    });

    connectButton.addEventListener("click", connectMetaMask);
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".verify-btn").forEach(button => {
        button.addEventListener("click", async (event) => {
            const fileHash = event.target.getAttribute("data-hash");

            try {
                const response = await fetch(`/verify/${fileHash}`);
                const result = await response.json();

                if (result.success) {
                    alert(`✅ الوثيقة مسجلة في البلوكشين!\n👤 المالك: ${result.owner}\n📅 التاريخ: ${result.timestamp}\n📌 الحالة: ${result.isValid ? "صالحة" : "غير صالحة"}`);
                } else {
                    alert("⚠️ الوثيقة غير موجودة في البلوكشين.");
                }
            } catch (error) {
                console.error("❌ خطأ أثناء التحقق من الوثيقة:", error);
            }
        });
    });
});

