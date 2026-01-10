import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testEmail = async () => {
    try {
        console.log('Testing Gmail configuration...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configured***' : 'NOT SET');

        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `"Nirvana Health Test" <${process.env.EMAIL_USER}>`,
            to: 'shreshtajunjuru@gmail.com',
            subject: '✅ Gmail Test - Nirvana Backend',
            html: `
                <h1>🎉 Success!</h1>
                <p>Gmail integration is working correctly!</p>
                <p><strong>Test OTP:</strong> 123456</p>
                <p>This is a test email from Nirvana Health backend.</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            `,
            text: 'Gmail integration test successful! OTP: 123456'
        };

        console.log('\nSending test email to shreshtajunjuru@gmail.com...');
        const info = await transporter.sendMail(mailOptions);

        console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
        console.log('Message ID:', info.messageId);
        console.log('\nPlease check:');
        console.log('1. Inbox of shreshtajunjuru@gmail.com');
        console.log('2. Spam/Junk folder');
        console.log('3. Sender should be:', process.env.EMAIL_USER);

    } catch (error) {
        console.error('\n❌ EMAIL FAILED:');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
    }
};

testEmail();
