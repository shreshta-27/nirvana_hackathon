import nodemailer from 'nodemailer';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

export const sendOTPEmail = async (email, otp, expiryMinutes = 10) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Nirvana Health" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Nirvana Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background-color: #f9f9f9; border-radius: 10px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                        .header { text-align: center; color: #4CAF50; margin-bottom: 30px; }
                        .otp-box { background-color: #4CAF50; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
                        .info { text-align: center; color: #666; margin-top: 20px; }
                        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 20px; border-radius: 4px; }
                        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🏥 Nirvana Health</h1></div>
                        <p>Hello,</p>
                        <p>You have requested a verification code to access your Nirvana Health account.</p>
                        <div class="otp-box">${otp}</div>
                        <div class="info"><p><strong>This code will expire in ${expiryMinutes} minutes.</strong></p></div>
                        <div class="footer"><p>© 2026 Nirvana Health. All rights reserved.</p></div>
                    </div>
                </body>
                </html>
            `,
            text: `Your Nirvana verification code is: ${otp}`
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export const sendWelcomeEmail = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Nirvana Health" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Nirvana Health!',
            html: `<p>Dear ${name}, Welcome to Nirvana Health!</p>`,
            text: `Dear ${name}, Welcome to Nirvana Health!`
        };
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Welcome email error:', error);
        return { success: false, error: error.message };
    }
};

export const sendAlertEmail = async (email, subject, message) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Nirvana Health" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background-color: #f9f9f9; border-radius: 10px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                        .header { text-align: center; color: #e74c3c; margin-bottom: 30px; }
                        .message { background-color: white; padding: 20px; border-radius: 5px; border-left: 4px solid #e74c3c; }
                        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🏥 Health Alert</h1></div>
                        <div class="message">${message.replace(/\n/g, '<br>')}</div>
                        <div class="footer"><p>© 2026 Nirvana Health. Please consult a doctor immediately.</p></div>
                    </div>
                </body>
                </html>
            `,
            text: message
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Alert email error:', error);
        return { success: false, error: error.message };
    }
};
