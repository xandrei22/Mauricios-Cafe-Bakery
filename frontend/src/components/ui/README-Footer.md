# Footer Components

This directory contains two footer components for the Mauricio's Cafe and Bakery application:

## Footer.tsx
A comprehensive footer component with full business information including:
- Contact information (location, phone, email, Facebook)
- Business hours
- Specialty information
- "Made with Love" section
- Copyright notice

### Usage:
```tsx
import Footer from '../components/ui/Footer';

// Full footer with all business information
<Footer />

// Footer without business information section
<Footer showBusinessInfo={false} />

// Footer with custom styling
<Footer className="mt-8" />
```

### Props:
- `className?: string` - Additional CSS classes
- `showBusinessInfo?: boolean` - Whether to show the business information section (default: true)

## SimpleFooter.tsx
A compact footer component with just the essential contact information:
- Contact information (location, phone, email, Facebook)
- Copyright notice

### Usage:
```tsx
import SimpleFooter from '../components/ui/SimpleFooter';

// Simple footer
<SimpleFooter />

// Simple footer with custom styling
<SimpleFooter className="mt-8" />
```

### Props:
- `className?: string` - Additional CSS classes

## When to Use Which Footer

### Use Footer.tsx for:
- Main landing pages
- Public-facing pages
- Pages where you want to showcase the full business information

### Use SimpleFooter.tsx for:
- Success/confirmation pages
- Modal overlays
- Pages where space is limited
- Pages that don't need extensive business information

## Styling
Both footers use the brand colors:
- Primary brown: `#6B5B5B`
- Accent brown: `#a87437`
- Background: White with subtle borders

The footers are fully responsive and will adapt to different screen sizes.















