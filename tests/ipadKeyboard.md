# Physical iPad keyboard regression

Use a local Cycle Count build with the matching AccxUI keyboard helper, signed in
to a real test OMS. Do not save hand-counted items, scan a barcode with Enter,
submit a count, or change inventory. Record existing quantities and active locks
before opening a session; clean up only locks acquired during this test.

1. Open an existing mutable session. Tap the counted/uncounted product search
   below the statistics, then show the full software keyboard. The input must
   remain fully visible; the page header and scanner must stay on screen while
   the dashboard scrolls. Dismiss without blur, refocus, and repeat.
2. Open Add hand-counted items. Search for three real products and add them to
   the unsaved list. Focus the bottom Qty field, show the keyboard, and type a
   quantity using native keys. The whole field must be visible and retain focus.
3. Dismiss without blur, refocus/edit, rotate portrait/landscape, and return to
   the scanner. Clear/remove all unsaved test cards before leaving.
4. On a populated session, scroll the virtual list in both directions and filter
   products. Rows must remain visible and the list must still scroll after
   keyboard dismissal. Do not treat an empty list as virtual-list coverage.
5. Repeat in Safari and a temporary Home Screen standalone preview. Remove the
   preview and stop its temporary HTTPS tunnel afterward.

For temporary HTTPS previews, build with
`NODE_ENV=development VITE_OMS_TYPE=MOQUI pnpm exec vite build --mode development`
and serve only `dist/` with SPA fallback. Never expose a Vite server inheriting
root dev credentials. Authenticate normally against the real test instance.

The app opts into AccxUI `useIosKeyboardScroll` in App.vue and disables Ionic's
built-in assist only when `supportsIosKeyboardScroll()` succeeds. The framework
owns keyboard measurement and focus reveal; the app supplies its inner panel
and virtual-list selectors. Merge/release the framework dependency first.
