# BlurText Component - Enhanced

An enhanced version of the BlurText component that supports both text and component-based blur animations.

## Features

- ✅ **Text Animation**: Animate text by words or letters
- ✅ **Component Animation**: Animate React components with the same blur effects
- ✅ **Flexible Container**: Use any HTML element as the container
- ✅ **Intersection Observer**: Animations trigger when elements enter viewport
- ✅ **Customizable**: Full control over animation timing, direction, and effects

## Usage

### Basic Text Animation (Original)
```tsx
<BlurText 
  text="Your text here" 
  animateBy="words"
  className="text-2xl font-bold"
/>
```

### Component-Based Animation (New)
```tsx
<BlurText animateBy="components" className="space-x-4">
  <button className="btn btn-primary">Button 1</button>
  <button className="btn btn-secondary">Button 2</button>
  <div className="card">Custom Component</div>
</BlurText>
```

### Using BlurComponent Helper
```tsx
<BlurComponent className="space-y-4" delay={300}>
  <Card title="Card 1" />
  <Card title="Card 2" />
  <Card title="Card 3" />
</BlurComponent>
```

### Custom Container Element
```tsx
<BlurText 
  as="section" 
  animateBy="components" 
  className="grid grid-cols-3 gap-4"
>
  <FeatureCard />
  <FeatureCard />
  <FeatureCard />
</BlurText>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `""` | Text to animate (for text-based animation) |
| `children` | `ReactNode` | - | Components to animate |
| `animateBy` | `"words"` \| `"letters"` \| `"components"` | `"words"` | How to split the animation |
| `as` | `ElementType` | `"div"` | Container element type |
| `delay` | `number` | `200` | Delay between animations (ms) |
| `direction` | `"top"` \| `"bottom"` | `"top"` | Animation direction |
| `className` | `string` | `""` | CSS classes for container |
| `threshold` | `number` | `0.1` | Intersection observer threshold |
| `stepDuration` | `number` | `0.35` | Duration of each animation step |
| `animationFrom` | `Record<string, string \| number>` | - | Custom initial animation state |
| `animationTo` | `Array<Record<string, string \| number>>` | - | Custom animation keyframes |
| `easing` | `(t: number) => number` | `(t) => t` | Custom easing function |
| `onAnimationComplete` | `() => void` | - | Callback when animation completes |

## Animation Modes

### 1. Words (`animateBy="words"`)
Splits text by spaces and animates each word separately.

### 2. Letters (`animateBy="letters"`)
Splits text by characters and animates each letter separately.

### 3. Components (`animateBy="components"`)
Animates each child React component separately with the same blur effect.

## Examples

### Gaming UI Components
```tsx
<BlurComponent className="flex space-x-4" delay={200}>
  <PlayerCard player={player1} />
  <PlayerCard player={player2} />
  <ScoreBoard />
</BlurComponent>
```

### Navigation Menu
```tsx
<BlurText as="nav" animateBy="components" className="flex space-x-6">
  <NavLink href="/">Home</NavLink>
  <NavLink href="/about">About</NavLink>
  <NavLink href="/contact">Contact</NavLink>
</BlurText>
```

### Feature Grid
```tsx
<BlurText 
  as="section" 
  animateBy="components" 
  className="grid grid-cols-1 md:grid-cols-3 gap-6"
  delay={150}
>
  <FeatureCard icon="🎵" title="Music" />
  <FeatureCard icon="🎮" title="Gaming" />
  <FeatureCard icon="💬" title="Chat" />
</BlurText>
```

## Tips

1. Use `animateBy="components"` when you want to animate React components
2. Use `BlurComponent` helper for cleaner syntax when animating components
3. Adjust `delay` to control the stagger effect between animations
4. Use `as` prop to change the container element (div, section, nav, etc.)
5. Combine with Tailwind CSS classes for responsive layouts
