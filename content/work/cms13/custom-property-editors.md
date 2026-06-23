---
title: Custom Property Editors in CMS 13
tags:
  - optimizely
  - cms
  - csharp
  - javascript
  - editor-tools
---

CMS 13 replaces Dojo-based property editors with a modern **ES6 module** approach. Existing Dojo editors still work (backward compatible), but new editors no longer need Dojo at all. Modern tooling — TypeScript, React, Vue, Webpack, Vite — is now viable.

## The Editor Function Signature

```javascript
export default function myEditor(
    editorContainer,     // HTML element to render into
    initialValue,        // Current property value
    onEditorValueChange, // Callback to notify CMS of value changes
    widgetSettings,      // Server-side config (optional)
    readOnly             // Boolean
) { }
```

## Minimal Implementation

```javascript
export default function customEditor(editorContainer, initialValue, onEditorValueChange) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = initialValue || "";
    input.onchange = (event) => onEditorValueChange(event.target.value);
    editorContainer.appendChild(input);
}
```

## Full Lifecycle Pattern

Return an object with `render`, `updateValue`, and `destroy` for undo/redo support and proper cleanup:

```javascript
export default function myEditor(editorContainer, initialValue, onEditorValueChange, widgetSettings, readOnly) {
    return {
        render: function () {
            const input = document.createElement("input");
            input.type = "text";
            input.value = initialValue || "";
            if (readOnly) input.disabled = true;
            input.onchange = (event) => onEditorValueChange(event.target.value);
            editorContainer.appendChild(input);
            this._input = input;
        },
        updateValue: function (value) {
            this._input.value = value;  // Called on undo/redo
        },
        destroy: function () {
            // Cleanup — prevents memory leaks
        },
    };
}
```

## React Example (TypeScript)

```typescript
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MyComponent } from './MyComponent';

export default function reactEditor(
    editorContainer: HTMLElement,
    initialValue: string,
    onEditorValueChange: (value: string) => void,
    widgetSettings?: Record<string, unknown>,
    readOnly?: boolean
) {
    let root: Root | null = null;

    return {
        render: function () {
            const container = document.createElement('div');
            editorContainer.appendChild(container);
            root = createRoot(container);
            root.render(React.createElement(MyComponent, {
                initialValue,
                onValueChange: onEditorValueChange,
                readOnly,
                widgetSettings,
            }));
        },
        updateValue: function (value: string) {
            root?.render(React.createElement(MyComponent, {
                initialValue: value,
                onValueChange: onEditorValueChange,
                readOnly,
                widgetSettings,
            }));
        },
        destroy: function () {
            root?.unmount();
            root = null;
        },
    };
}
```

## Registering via [ClientEditor] Attribute

```csharp
[ContentType]
public class MyPage : PageData
{
    [ClientEditor(
        ClientEditingClass = "ClientResources/Scripts/Editors/my-editor.js",
        IsJavascriptModule = true)]   // Critical — must be true for ES6 modules
    public virtual string CustomProperty { get; set; }
}
```

## Registering via EditorDescriptor

Use this when you need to apply the editor to a type/UIHint globally, or pass server-side config:

```csharp
[EditorDescriptorRegistration(TargetType = typeof(string), UIHint = "MyCustomEditor")]
public class MyEditorDescriptor : EditorDescriptor
{
    public MyEditorDescriptor()
    {
        ClientEditingClass = "ClientResources/Scripts/Editors/my-editor.js";
    }

    public override void ModifyMetadata(ExtendedMetadata metadata, IEnumerable<Attribute> attributes)
    {
        base.ModifyMetadata(metadata, attributes);
        metadata.EditorConfiguration["isJavascriptModule"] = true;
        metadata.EditorConfiguration["myServerSideConfig"] = "some value";
    }
}
```

**Important:** JSON in `EditorConfiguration` must use `System.Text.Json` rules — property names must be double-quoted. Single quotes and unquoted keys are invalid in CMS 13.

## What's Available

- **Optimizely Axiom design system** — UI component library available for editor UI
- **No Dojo dependency** — build with any modern JS toolchain
- **Testing** — Vitest and Storybook are now viable for editor unit/component tests

## Sources

- [Grzegorz Wiechec — Custom Property Editors in Optimizely CMS 13](https://world.optimizely.com/blogs/grzegorz-wiechec/dates/2026/3/custom-property-editors-in-optimizely-cms-13/) *(Mar 2026)*
