document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('paymentForm');
    const deviceNameInput = document.getElementById('deviceName');
    const deviceTypeHp = document.getElementById('deviceTypeHp');
    const deviceTypeLaptop = document.getElementById('deviceTypeLaptop');
    const amountInput = document.getElementById('amount');
    const paymentStatusDiv = document.getElementById('paymentStatus');
    const statusMessage = document.getElementById('statusMessage');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const accessCodeDisplay = document.getElementById('accessCode');
    const transactionsList = document.getElementById('transactions');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const HOTSPOT_SSID = 'fufufafa';
    const HOTSPOT_PASSWORD = 'negaraKORUPSI';
    const WIFI_ENCRYPTION_TYPE = 'WPA';

    const HP_RATE_PER_10_MIN = 2000;
    const LAPTOP_RATE_PER_10_MIN = 5000;
    const DURATION_PER_UNIT_MS = 10 * 60 * 1000;

    function getDuration(amount, deviceType) {
        let ratePer10Min;
        if (deviceType === 'hp') {
            ratePer10Min = HP_RATE_PER_10_MIN;
        } else if (deviceType === 'laptop') {
            ratePer10Min = LAPTOP_RATE_PER_10_MIN;
        } else {
            return 0;
        }
        return (amount / ratePer10Min) * DURATION_PER_UNIT_MS;
    }

    function formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateTimers() {
        const transactionItems = transactionsList.querySelectorAll('li');
        transactionItems.forEach(item => {
            const timerSpan = item.querySelector('.timer');
            const endTime = parseInt(timerSpan.dataset.endTime);

            if (endTime) {
                const now = Date.now();
                const timeLeft = endTime - now;

                if (timeLeft > 0) {
                    timerSpan.textContent = `Sisa waktu: ${formatTime(timeLeft)}`;
                    timerSpan.style.color = '#dc3545';
                } else {
                    timerSpan.textContent = 'Waktu habis!';
                    timerSpan.style.color = '#6c757d';
                }
            }
        });
    }

    let timerInterval;

    async function processPaymentOnBackend(deviceName, amount, deviceType) {
        return new Promise(resolve => {
            setTimeout(() => {
                const success = Math.random() > 0.1;

                if (success) {
                    const voucherCode = generateVoucherCode();
                    const duration = getDuration(amount, deviceType);
                    const endTime = Date.now() + duration;
                    resolve({
                        status: 'success',
                        message: 'Pembayaran berhasil diproses oleh backend.',
                        accessCode: voucherCode,
                        timestamp: new Date().toISOString(),
                        endTime: endTime
                    });
                } else {
                    resolve({
                        status: 'error',
                        message: 'Pembayaran gagal. Silakan coba lagi.'
                    });
                }
            }, 2000);
        });
    }

    function generateVoucherCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function loadTransactions() {
        const transactions = JSON.parse(localStorage.getItem('hotspotTransactionsSecure')) || [];
        transactionsList.innerHTML = '';
        if (transactions.length === 0) {
            transactionsList.innerHTML = '<li>Belum ada transaksi.</li>';
        } else {
            const sortedTransactions = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            sortedTransactions.forEach(transaction => {
                const listItem = document.createElement('li');
                const transactionDate = new Date(transaction.timestamp);
                const formattedDate = transactionDate.toLocaleDateString('id-ID');
                const formattedTime = transactionDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                listItem.innerHTML = `
                   Perangkat: <span>${transaction.deviceName}</span><br>
                   Jenis: <span>${transaction.deviceType === 'hp' ? 'HP' : 'Laptop'}</span><br>
                   Jumlah: <span>Rp${transaction.amount.toLocaleString('id-ID')}</span><br>
                   Kode Akses: <span>${transaction.accessCode || 'N/A'}</span><br>
                   Tanggal: <span class="capek">${formattedDate}</span><br>
                   Waktu: <span class="capek">${formattedTime}</span><br>
                   <span class="timer" data-end-time="${transaction.endTime}"></span>
                `;
                transactionsList.appendChild(listItem);
            });
        }
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimers, 1000);
    }

    loadTransactions();

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin menghapus semua riwayat transaksi?')) {
                localStorage.removeItem('hotspotTransactionsSecure');
                loadTransactions();
            }
        });
    }

    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const deviceName = deviceNameInput.value.trim();
        const amount = parseInt(amountInput.value);
        const deviceType = document.querySelector('input[name="deviceType"]:checked').value;

        let minAmount;
        if (deviceType === 'hp') {
            minAmount = HP_RATE_PER_10_MIN;
        } else if (deviceType === 'laptop') {
            minAmount = LAPTOP_RATE_PER_10_MIN;
        }

        if (!deviceName || isNaN(amount) || amount < minAmount) {
            statusMessage.textContent = `Mohon lengkapi semua data dengan benar. Jumlah minimal untuk ${deviceType === 'hp' ? 'HP adalah Rp2.000' : 'Laptop adalah Rp5.000'}.`;
            statusMessage.style.color = '#dc3545';
            paymentStatusDiv.classList.remove('hidden');
            qrCodeContainer.classList.add('hidden');
            return;
        }

        statusMessage.textContent = `Mengirim data pembayaran ke server untuk ${deviceName} (${deviceType}) sebesar Rp${amount.toLocaleString('id-ID')}...`;
        statusMessage.style.color = '#007bff';
        paymentStatusDiv.classList.remove('hidden');
        qrCodeContainer.classList.add('hidden');
        accessCodeDisplay.textContent = '';
        qrCodeImage.src = '';

        try {
            const response = await processPaymentOnBackend(deviceName, amount, deviceType);

            if (response.status === 'success') {
                statusMessage.textContent = `Pembayaran berhasil! Kode akses Anda: ${response.accessCode}`;
                statusMessage.style.color = '#28a745';

                accessCodeDisplay.textContent = response.accessCode;

                const wifiQrData = `WIFI:S:${HOTSPOT_SSID};T:${WIFI_ENCRYPTION_TYPE};P:${HOTSPOT_PASSWORD};;`;

                const tempQrCodeDiv = document.createElement('div');
                new QRCode(tempQrCodeDiv, {
                    text: wifiQrData,
                    width: 200,
                    height: 200,
                    colorDark: "#007bff",
                    colorLight: "#e6f2ff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                setTimeout(() => {
                    const canvas = tempQrCodeDiv.querySelector('canvas');
                    if (canvas) {
                        qrCodeImage.src = canvas.toDataURL("image/png");
                        qrCodeContainer.classList.remove('hidden');
                    } else {
                        qrCodeImage.src = '';
                        statusMessage.textContent += " Gagal membuat QR code.";
                        statusMessage.style.color = '#dc3545';
                    }
                }, 50);

                const newTransaction = {
                    deviceName: deviceName,
                    amount: amount,
                    deviceType: deviceType,
                    accessCode: response.accessCode,
                    timestamp: response.timestamp,
                    endTime: response.endTime
                };
                const currentTransactions = JSON.parse(localStorage.getItem('hotspotTransactionsSecure')) || [];
                currentTransactions.push(newTransaction);
                localStorage.setItem('hotspotTransactionsSecure', JSON.stringify(currentTransactions));

                loadTransactions();

                paymentForm.reset();
                deviceNameInput.focus();

            } else {
                statusMessage.textContent = response.message;
                statusMessage.style.color = '#dc3545';
            }
        } catch (error) {
            statusMessage.textContent = `Terjadi kesalahan jaringan: ${error.message}`;
            statusMessage.style.color = '#dc3545';
        }
    });

    deviceTypeHp.addEventListener('change', () => {
        amountInput.min = HP_RATE_PER_10_MIN;
        amountInput.placeholder = 'Misal: Rp2.000, Rp3.000, dst.';
        if (parseInt(amountInput.value) < HP_RATE_PER_10_MIN) {
            amountInput.value = HP_RATE_PER_10_MIN;
        }
    });

    deviceTypeLaptop.addEventListener('change', () => {
        amountInput.min = LAPTOP_RATE_PER_10_MIN;
        amountInput.placeholder = 'Misal: Rp5.000, Rp7.500, dst.';
        if (parseInt(amountInput.value) < LAPTOP_RATE_PER_10_MIN) {
            amountInput.value = LAPTOP_RATE_PER_10_MIN;
        }
    });

    amountInput.min = HP_RATE_PER_10_MIN;
    amountInput.placeholder = 'Misal: Rp2.000, Rp3.000, dst.';
});
