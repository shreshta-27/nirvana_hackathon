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
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background-color: #f9f9f9;
                            border-radius: 10px;
                            padding: 30px;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            color: #4CAF50;
                            margin-bottom: 30px;
                        }
                        .otp-box {
                            background-color: #4CAF50;
                            color: white;
                            font-size: 32px;
                            font-weight: bold;
                            text-align: center;
                            padding: 20px;
                            border-radius: 8px;
                            letter-spacing: 8px;
                            margin: 20px 0;
                        }
                        .info {
                            text-align: center;
                            color: #666;
                            margin-top: 20px;
                        }
                        .warning {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 12px;
                            margin-top: 20px;
                            border-radius: 4px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            color: #999;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏥 Nirvana Health</h1>
                        </div>
                        
                        <p>Hello,</p>
                        
                        <p>You have requested a verification code to access your Nirvana Health account.</p>
                        
                        <div class="otp-box">
                            ${otp}
                        </div>
                        
                        <div class="info">
                            <p><strong>This code will expire in ${expiryMinutes} minutes.</strong></p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong><br>
                            Never share this code with anyone. Nirvana Health staff will never ask for your verification code.
                        </div>
                        
                        <p style="margin-top: 20px;">If you didn't request this code, please ignore this email or contact our support team.</p>
                        
                        <div class="footer">
                            <p>© 2026 Nirvana Health. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Your Nirvana verification code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Never share this code with anyone.`
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId
        };
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
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background-color: #f9f9f9;
                            border-radius: 10px;
                            padding: 30px;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            color: #4CAF50;
                            margin-bottom: 30px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            color: #999;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏥 Welcome to Nirvana Health!</h1>
                        </div>
                        
                        <p>Dear ${name},</p>
                        
                        <p>Thank you for joining Nirvana Health! We're excited to have you on board.</p>
                        
                        <p>Your account has been successfully created and verified. You can now access all our healthcare services.</p>
                        
                        <p><strong>What you can do:</strong></p>
                        <ul>
                            <li>Schedule appointments with doctors</li>
                            <li>Track your health records</li>
                            <li>Receive health alerts and reminders</li>
                            <li>Access telemedicine services</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="#" class="button">Get Started</a>
                        </div>
                        
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        
                        <div class="footer">
                            <p>© 2026 Nirvana Health. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Dear ${name}, Welcome to Nirvana Health! Your account has been successfully created.`
        };

        await transporter.sendMail(mailOptions);

        return { success: true };
    } catch (error) {
        console.error('Welcome email error:', error);
        return { success: false, error: error.message };
    }
};
