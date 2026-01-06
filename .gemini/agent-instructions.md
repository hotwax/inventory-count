# Agent Coding Instructions - Ionic Enforcement

This document defines strict coding standards for all AI agents working on this repository (`inventory-count`).

## Core Principles

1.  **Strict Ionic Native Components**:
    *   ALWAYS use [Ionic Framework components](https://ionicframework.com/docs/components) for all UI elements and layouts.
    *   Use Ionic utility classes (e.g., `ion-padding`, `ion-margin`, `ion-text-center`) for spacing and alignment.

2.  **Zero Custom CSS**:
    *   **Prohibition**: DO NOT write custom CSS in `<style>` blocks or external `.css`/`.scss` files.
    *   **Exception**: If a layout specifically requires custom CSS that Ionic cannot provide, you must:
        1.  Proceed with the Ionic-only implementation even if the layout is compromised.
        2.  Identify exactly where custom styling is needed.
        3.  Explicitly document these requirements in the `walkthrough.md` for the user to review or implement manually.

3.  **Layout Compromise**:
    *   It is acceptable for the UI to not match a specific design perfectly if it means staying within the boundaries of native Ionic components and utilities.
    *   Consistency with the Ionic ecosystem is prioritized over pixel-perfect custom designs.

## Implementation Workflow

*   When creating or modifying components (Vue/HTML), use only Ionic tags (`ion-*`).
*   Check the [Ionic Utilities](https://ionicframework.com/docs/layout/css-utilities) documentation before even considering custom CSS.
*   In every `walkthrough.md`, include a section titled **"Layout and Styling Considerations"** to report any compromises made.
