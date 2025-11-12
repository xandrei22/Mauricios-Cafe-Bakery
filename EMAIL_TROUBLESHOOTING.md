# Email Troubleshooting Guide

## Problem: Emails Not Being Sent to Gmail

If emails (verification, password reset, low stock notifications) are not being sent, follow these steps:

## Step 1: Check Environment Variables

The email service requires **ONE** of these sets of environment variables:

### Option 1: Brevo (Recommended - Free 300 emails/day)
```env
BREVO_SMTP_USER=your-email@example.com
BREVO_SMTP_PASS=your-brevo-smtp-password
```

### Option 2: Gmail (Requires App Password)
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

**Important for Gmail:**
- You CANNOT use your regular Gmail password
- You MUST create an App Password:
  1. Go to Google Account → Security
  2. Enable 2-Step Verification (if not already enabled)
  3. Go to App Passwords
  4. Generate a new app password for "Mail"
  5. Use that 16-character password (not your regular password)

## Step 2: Check Backend Logs

When the backend starts, you should see one of these messages:

### ✅ Success Messages:
```
✅ Brevo SMTP credentials found, creating transporter...
✅ Using Brevo (formerly Sendinblue) SMTP
✅ Brevo SMTP server is ready to send messages
```

OR

```
✅ Using Gmail as fallback...
✅ Gmail SMTP server is ready to send messages
```

### ❌ Error Messages:
```
❌ Email service disabled - no credentials found
❌ Brevo SMTP configuration error: ...
❌ Gmail SMTP configuration error: ...
```

## Step 3: Test Email Sending

When an email is attempted, you should see logs like:

### ✅ Success:
```
📧 Attempting to send email: { from: '...', to: '...', subject: '...' }
✅ Email sent successfully: { messageId: '...', accepted: ['...'] }
```

### ❌ Failure:
```
❌ Email service not available - transporter is null
❌ Error sending email: ...
```

## Step 4: Common Issues and Solutions

### Issue 1: "Email service not configured"
**Solution:** Set the environment variables in your hosting platform (Render/Railway/etc.)

### Issue 2: "Gmail SMTP configuration error"
**Solution:** 
- Make sure you're using an App Password, not your regular password
- Check that 2-Step Verification is enabled
- Verify the EMAIL_USER and EMAIL_PASSWORD are correct

### Issue 3: "Brevo SMTP configuration error"
**Solution:**
- Verify BREVO_SMTP_USER and BREVO_SMTP_PASS are correct
- Check your Brevo account is active
- Make sure you haven't exceeded the free tier limit (300 emails/day)

### Issue 4: Emails sent but not received
**Solution:**
- Check spam/junk folder
- Verify the recipient email address is correct
- Check if emails are being blocked by the recipient's email provider

## Step 5: Setup Brevo (Recommended)

1. **Sign up:** https://www.brevo.com/
2. **Get SMTP credentials:**
   - Go to Settings → SMTP & API
   - Click "SMTP" tab
   - Copy your SMTP login and password
3. **Add to environment variables:**
   ```
   BREVO_SMTP_USER=your-email@example.com
   BREVO_SMTP_PASS=your-smtp-password
   ```
4. **Deploy and test**

## Step 6: Verify Email Service Status

Check your backend logs on startup. You should see:
- Which email service is being used (Brevo or Gmail)
- Whether the SMTP connection was successful
- Any configuration errors

## Debugging Tips

1. **Check backend logs** when:
   - User signs up (verification email)
   - User requests password reset
   - Low stock alert is triggered

2. **Look for these log patterns:**
   - `📧 Attempting to send email` - Email is being attempted
   - `✅ Email sent successfully` - Email was sent
   - `❌ Error sending email` - Email failed to send

3. **Test with a simple email:**
   - Try signing up a new account
   - Check if verification email arrives
   - Check backend logs for any errors

## Quick Fix Checklist

- [ ] Environment variables are set in hosting platform
- [ ] Backend logs show "Email server is ready to send messages"
- [ ] Using App Password for Gmail (not regular password)
- [ ] Brevo account is active (if using Brevo)
- [ ] Checked spam folder
- [ ] Verified recipient email address is correct
- [ ] Backend logs show email attempts (not just "skipping email")

## Need More Help?

Check the backend logs for specific error messages. The improved error logging will show:
- What environment variables are missing
- SMTP connection errors
- Email sending errors with details




