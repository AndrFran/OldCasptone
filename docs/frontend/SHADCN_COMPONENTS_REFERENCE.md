# shadcn/ui Components Reference

**Location:** `/frontend/src/components/ui/`

Quick guide to using the shadcn/ui components in UC4 frontend.

---

## 1. Button Component

**Import:**
```jsx
import { Button } from '@/components/ui'
```

**Basic Usage:**
```jsx
<Button>Click Me</Button>
<Button variant="secondary">Secondary</Button>
<Button disabled>Disabled</Button>
```

**Props:**
| Prop | Type | Options | Default |
|------|------|---------|---------|
| `variant` | string | default, secondary, destructive, outline, ghost, link | default |
| `size` | string | default, sm, lg, icon | default |
| `disabled` | boolean | true, false | false |
| `className` | string | Any Tailwind class | - |
| `onClick` | function | Event handler | - |
| `type` | string | button, submit, reset | button |

**All Variants:**
```jsx
<Button variant="default">Default (Blue)</Button>
<Button variant="secondary">Secondary (Gray)</Button>
<Button variant="destructive">Destructive (Red)</Button>
<Button variant="outline">Outline (Border)</Button>
<Button variant="ghost">Ghost (No bg)</Button>
<Button variant="link">Link (Underline)</Button>
```

**All Sizes:**
```jsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">📦</Button>
```

**Common Patterns:**
```jsx
// Submit button
<Button type="submit" variant="default">Submit</Button>

// Disabled state
<Button disabled variant="secondary">Disabled</Button>

// Loading state
<Button disabled>{loading ? 'Loading...' : 'Search'}</Button>

// Icon button
<Button size="icon" variant="outline">🔍</Button>

// Full width
<Button className="w-full">Full Width</Button>

// With custom styling
<Button className="mt-4 px-8">Custom</Button>
```

---

## 2. Card Component

**Import:**
```jsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui'
```

**Basic Structure:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

**Minimal Card:**
```jsx
<Card>
  <CardContent className="pt-6">
    Just content, no header
  </CardContent>
</Card>
```

**With Just Header:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>My Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

**Common Patterns:**
```jsx
// Gradient card
<Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
  <CardContent className="pt-6">Gradient content</CardContent>
</Card>

// Dark card
<Card className="bg-gray-50">
  <CardContent className="pt-6">Light background</CardContent>
</Card>

// Card with spacing
<Card className="mb-8">
  <CardHeader>
    <CardTitle>Spaced Card</CardTitle>
  </CardHeader>
  <CardContent>Content with margin bottom</CardContent>
</Card>

// Hoverable card
<Card className="hover:shadow-lg transition-shadow">
  <CardContent className="pt-6">Hover for shadow</CardContent>
</Card>
```

---

## 3. Input Component

**Import:**
```jsx
import { Input } from '@/components/ui'
```

**Basic Usage:**
```jsx
<Input type="text" placeholder="Enter text..." />
<Input type="email" placeholder="your@email.com" />
<Input type="password" placeholder="••••••••" />
<Input type="number" placeholder="123" />
```

**Props:**
| Prop | Type | Options | Default |
|------|------|---------|---------|
| `type` | string | text, email, password, number, etc. | text |
| `placeholder` | string | Any text | - |
| `value` | string | Controlled value | - |
| `onChange` | function | Event handler | - |
| `disabled` | boolean | true, false | false |
| `className` | string | Any Tailwind class | - |

**Common Patterns:**
```jsx
// Controlled input
const [value, setValue] = useState('')
<Input 
  value={value} 
  onChange={(e) => setValue(e.target.value)}
  placeholder="Type something..."
/>

// In a form
<form onSubmit={handleSearch}>
  <Input 
    type="text"
    placeholder="Order ID"
    value={orderId}
    onChange={(e) => setOrderId(e.target.value)}
    disabled={loading}
  />
  <Button type="submit">Search</Button>
</form>

// Flex layout
<div className="flex gap-2">
  <Input placeholder="First..." className="flex-1" />
  <Button>Submit</Button>
</div>

// With custom width
<Input type="email" placeholder="email" className="w-64" />

// Disabled state
<Input disabled value="Read-only" placeholder="..." />
```

---

## 4. Badge Component

**Import:**
```jsx
import { Badge } from '@/components/ui'
```

**Basic Usage:**
```jsx
<Badge>Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="info">Info</Badge>
```

**Props:**
| Prop | Type | Options | Default |
|------|------|---------|---------|
| `variant` | string | default, secondary, destructive, success, warning, info | default |
| `className` | string | Any Tailwind class | - |

**All Variants:**
```jsx
<Badge variant="default">Default (Gray)</Badge>
<Badge variant="secondary">Secondary (Light gray)</Badge>
<Badge variant="destructive">Destructive (Red)</Badge>
<Badge variant="success">Success (Green)</Badge>
<Badge variant="warning">Warning (Yellow)</Badge>
<Badge variant="info">Info (Blue)</Badge>
```

**Common Patterns:**
```jsx
// Stock status
<Badge variant="success">In Stock</Badge>
<Badge variant="warning">Low Stock</Badge>
<Badge variant="destructive">Out of Stock</Badge>

// Order status
<Badge variant="info">Pending</Badge>
<Badge variant="success">Confirmed</Badge>
<Badge variant="warning">Shipped</Badge>
<Badge variant="success">Delivered</Badge>

// Inline badges
<div>
  Order Status: <Badge variant="info">Current</Badge>
</div>

// In a list
{statusList.map(status => (
  <Badge key={status} variant={getVariant(status)}>
    {status}
  </Badge>
))}

// With custom spacing
<Badge className="mt-3 ml-2">Positioned</Badge>
```

---

## Real-World Examples

### Search Form (OrderTracking)
```jsx
<Card className="mb-8">
  <CardContent className="pt-6">
    <form onSubmit={handleSearch} className="flex gap-2">
      <Input
        type="text"
        placeholder="Enter order ID (e.g., 12345)"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={loading || !orderId.trim()}
        variant="default"
      >
        {loading ? 'Searching...' : 'Track'}
      </Button>
    </form>
  </CardContent>
</Card>
```

### Order Details Card
```jsx
<Card>
  <CardHeader>
    <CardTitle>Order Details</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span>${subtotal}</span>
      </div>
      <div className="flex justify-between text-green-600">
        <span>Discount:</span>
        <span>-${discount}</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-bold">
        <span>Total:</span>
        <span>${total}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### Product Card with Badges
```jsx
<Card className="hover:shadow-lg transition-shadow">
  <div className="h-48 bg-blue-100 relative flex items-center">
    <div className="text-6xl w-full text-center">📦</div>
    {outOfStock && (
      <Badge variant="destructive" className="absolute inset-0">
        Out of Stock
      </Badge>
    )}
    {lowStock && !outOfStock && (
      <Badge variant="warning" className="absolute top-2 right-2">
        Low Stock
      </Badge>
    )}
  </div>
  <CardContent className="pt-4">
    <h3 className="font-semibold mb-2">{product.name}</h3>
    <div className="flex justify-between mb-4">
      <span className="text-xl font-bold">${price}</span>
      <span className="text-sm text-gray-500">{stock} in stock</span>
    </div>
    <Button 
      onClick={handleAddToCart}
      disabled={outOfStock}
      variant={outOfStock ? 'secondary' : 'default'}
      className="w-full"
    >
      {outOfStock ? 'Out of Stock' : 'Add to Cart'}
    </Button>
  </CardContent>
</Card>
```

### Status Timeline with Badges
```jsx
<Card>
  <CardHeader>
    <CardTitle>Order Status</CardTitle>
  </CardHeader>
  <CardContent>
    {statusSteps.map((status, index) => (
      <div key={status} className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center
          ${index <= currentIndex ? 'bg-green-100' : 'bg-gray-100'}`}>
          {index <= currentIndex ? '✓' : '•'}
        </div>
        <span className="font-medium capitalize">{status}</span>
        {index === currentIndex && (
          <Badge variant="info">Current</Badge>
        )}
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Styling & Customization

### Adding Custom Classes
```jsx
// Button with custom spacing
<Button className="mt-4 px-8 py-3">Custom</Button>

// Card with custom border
<Card className="border-2 border-blue-500">
  <CardContent className="pt-6">Custom Card</CardContent>
</Card>

// Badge with custom text size
<Badge className="text-lg">Large Badge</Badge>
```

### Responsive Design
```jsx
// Button sizes change on mobile
<Button className="px-2 sm:px-4 md:px-8">Responsive</Button>

// Card columns stack on mobile
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Combining with Tailwind
```jsx
// Using Tailwind utilities with components
<Button className="hover:translate-y-1 transition-transform">Hover effect</Button>
<Card className="shadow-lg border-l-4 border-blue-500">Card with border</Card>
<Badge className="inline-block px-4 py-2 rounded-full">Styled</Badge>
```

---

## Accessibility Features

All components include:
- ✅ Focus visible states (ring-primary)
- ✅ Disabled state handling
- ✅ Semantic HTML (`<button>`, `<input>`)
- ✅ Proper contrast ratios
- ✅ Tab navigation support

---

## Performance Tips

1. **Memo components** if rendering many:
```jsx
const ProductCard = memo(({ product }) => (...))
```

2. **Use classname strategically**:
```jsx
// Good
<Button className="mt-4">Click</Button>

// Avoid excessive nesting
<div className="...">
  <Card className="...">
    <CardContent className="...">...</CardContent>
  </Card>
</div>
```

3. **Leverage Tailwind CSS utility CSS** instead of custom CSS

---

## Import Shorthand

Instead of importing individual components:
```jsx
// Long form
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'

// Use the index file (recommended)
import { Button, Card, CardContent, CardHeader, Input, Badge } from '@/components/ui'
```

---

**Ready to use!** All components are production-ready and fully integrated. 🚀

