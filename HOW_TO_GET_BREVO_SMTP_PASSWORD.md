# How to Get Your Brevo SMTP Password

## Step-by-Step Instructions

### Step 1: Log in to Brevo

1. **Go to:** https://app.brevo.com/
2. **Log in** with your account

### Step 2: Navigate to SMTP Settings

1. **Click** on your profile icon (top right)
2. **Click** "SMTP & API"
3. **Or** go directly to: https://app.brevo.com/settings/advanced

### Step 3: Find Your SMTP Details

You'll see a page with:

**SMTP Server:**
```
smtp-relay.brevo.com
```

**Port:** 
```
587
```

**Login:**
```
alexandrei1628@gmail.com
```
(This is the username - use this for `BREVO_SMTP_USER`)

**Password:** 
```
[Click "Generate" button to create a password]
```
(This is what you need for `BREVO_SMTP_PASS`)

### Step 4: Generate SMTP Password (If Needed)

1. **Click** the "Generate" button next to Password
2. A new password will be created
3. **Copy this password** immediately (you won't see it again!)
4. This is your `BREVO_SMTP_PASS`

### Step 5: Add to Render

In Render Dashboard → Environment:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `BREVO_SMTP_USER` | `alexandrei1628@gmail.com` | From "Login" field in Brevo |
| `BREVO_SMTP_PASS` | `XXXXXXX` | From "Generate" button in Brevo |

## Important Notes

⚠️ **You ONLY need SMTP credentials, NOT the API Key**

- ✅ **SMTP Login** (username) → `BREVO_SMTP_USER`
- ✅ **SMTP Password** (from Generate button) → `BREVO_SMTP_PASS`
- ❌ **API Key** (ignore this - don't need it)

## Visual Guide

In Brevo dashboard:
```
SMTP & API
├── SMTP (use this!)
│   ├── Server: smtp-relay.brevo.com
│   ├── Login: alexandrei1628@gmail.com ← BREVO_SMTP_USER
│   └── Password: [Generate button] ← BREVO_SMTP_PASS
│
└── API keys (ignore this - not needed)
    └── API keys for developers
```

## Testing

After setting in Render, check logs:
```
✅ Brevo SMTP credentials found
✅ Using Brevo (formerly Sendinblue) SMTP
Email server is ready to send messages
```

That means it's working!

































