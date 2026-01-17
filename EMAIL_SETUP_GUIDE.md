# Email Setup Guide for Render

## Environment Variables Required

You need to set these **two environment variables** in Render:

### 1. EMAIL_USER
- **Type:** Text
- **Value:** Your Gmail address
- **Example:** `alexandrei1628@gmail.com`

### 2. EMAIL_PASS
- **Type:** Secret (will be hidden)
- **Value:** Your Gmail App Password (NOT your regular password!)
- **Example:** `dstm egwy wnvp ecvt`

## How to Create a Gmail App Password

1. **Go to:** https://myaccount.google.com/apppasswords
2. **Sign in** with your Gmail account
3. **Select app:** Choose "Mail"
4. **Select device:** Choose "Other (Custom name)"
5. **Enter name:** Type "Cafe App" or any name
6. **Click "Generate"**
7. **Copy the 16-character password** (remove spaces if any)
8. **Paste it into Render** as `EMAIL_PASS`

## Where to Set in Render

1. **Go to:** Your Render dashboard
2. **Click:** Your backend service
3. **Click:** "Environment" tab
4. **Add these variables:**

   | Key | Value | Type |
   |-----|-------|------|
   | `EMAIL_USER` | `alexandrei1628@gmail.com` | Plain Text |
   | `EMAIL_PASS` | Your 16-char App Password | Secret |

## Verify It's Working

After setting environment variables:

1. **Redeploy** your backend
2. **Check logs** for:
   ```
   Email server is ready to send messages
   ```
3. **If you see:**
   ```
   Email service disabled - EMAIL_USER and EMAIL_PASS/EMAIL_PASSWORD not configured
   ```
   → Variables not set or not loaded

## Common Issues

### Issue 1: "Email service not available"
**Solution:** Check that both `EMAIL_USER` and `EMAIL_PASS` are set in Render

### Issue 2: "Invalid credentials"
**Solution:** Make sure you're using an App Password, NOT your regular Gmail password

### Issue 3: "Less secure apps"
**Solution:** Enable 2-factor authentication on your Gmail account, then create App Password

## After Setup

Once configured:
- ✅ Signup will send verification emails
- ✅ Password reset will send emails
- ✅ Welcome emails will be sent after verification
- ✅ Event notifications will be sent

## Testing

Try signing up a new customer:
1. Go to signup page
2. Fill in the form
3. Submit
4. You should receive a verification email
5. Click the link to verify
6. You can now log in

































