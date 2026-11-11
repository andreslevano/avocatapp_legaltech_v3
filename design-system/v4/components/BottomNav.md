BottomNav is the mobile (< 768px) replacement for AppRail: five destinations, icon + label, 64px tall, 44px touch targets.

**Rules:** labels always visible (icons alone are ambiguous); the sixth section and profile live in “Más”/the header avatar; respects the iOS safe area (`padding-bottom: env(safe-area-inset-bottom)`); hidden while the on-screen keyboard is open in the agent composer.

**Replaces:** the `md:hidden fixed bottom-0` block in `layout/Rail.tsx`.
