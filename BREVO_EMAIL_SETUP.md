# Brevo Email Setup Guide

## What is Brevo?
Brevo (formerly Sendinblue) is a transactional email service that's:
- ✅ Free for 300 emails per day
- ✅ More reliable than Gmail
- ✅ No App Passwords needed
- ✅ Better for production use
- ✅ Easy to set up

## Step-by-Step Setup

### Step 1: Create a Brevo Account

1. **Go to:** https://www.brevo.com/
2. **Sign up** for free account
3. **Verify your email**
4. **Complete setup**

### Step 2: Get Your SMTP Credentials

1. **Log in** to Brevo
2. **Go to:** Settings → SMTP & API
3. **Click:** "SMTP" tab
4. **You'll see:**
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** Your SMTP login (e.g., `alexandrei1628@gmail.com`)
   - **Password:** Your SMTP password (click "Generate" if you need to create one)

### Step 3: Add Environment Variables to Render

**Go to:** Render Dashboard → Your Backend Service → Environment

**Add these variables:**

| Variable Name | Value | Example |
|--------------|-------|---------|
| `BREVO_SMTP_USER` | Your SMTP login from Brevo | `alexandrei1628@gmail.com` |
| `BREVO_SMTP_PASS` | Your SMTP password from Brevo | `ABC123XYZ` |

### Step 4: Deploy

```bash
git add capstone/backend/utils/emailService.js
git commit -m "Switch email service to Brevo SMTP"
git push origin main
```

### Step 5: Verify

Check Render logs. You should see:
```
🔍 Checking email configuration...
BREVO_SMTP_USER: ✓ Set
BREVO_SMTP_PASS: ✓ Set
✅ Brevo SMTP credentials found, creating transporter...
✅ Using Brevo (formerly Sendinblue) SMTP
Email server is ready to send messages
```

## Testing

Try signing up a customer:
1. Go to signup page
2. Fill in the form
3. Submit
4. **You should receive a verification email from Brevo**

## Benefits of Brevo Over Gmail

| Feature | Gmail | Brevo |
|---------|-------|-------|
| Free tier | Yes | Yes (300/day) |
| App Password needed | Yes | No |
| Delivery rate | Good | Excellent |
| Transactional emails | Limited | Optimized |
| Analytics | Basic | Advanced |
| Setup complexity | Medium | Easy |

## Why This is Better

- ✅ **No App Passwords** - just username and password
- ✅ **More reliable** - designed for transactional emails
- ✅ **Better deliverability** - emails less likely to go to spam
- ✅ **Free tier** - 300 emails/day is plenty for most apps
- ✅ **Easier setup** - no 2FA or special settings needed

## If You Need More Emails

Upgrade Brevo plan:
- Free: 300/day
- Lite: 10,000/day ($9/month)
- Premium: Unlimited ($49/month)

## Troubleshooting

### Issue: "Email service not available"
**Solution:** Make sure `BREVO_SMTP_USER` and `BREVO_SMTP_PASS` are set in Render

### Issue: "Invalid credentials"
**Solution:** Regenerate your SMTP password in Brevo dashboard

### Issue: Still seeing Gmail fallback
**Solution:** Logs will show which service is being used - check your Render logs

## Migration Complete

Your app now uses Brevo for email!
- Verification emails sent via Brevo
- Welcome emails sent via Brevo  
- Password reset emails sent via Brevo
- All emails more reliable and professional









