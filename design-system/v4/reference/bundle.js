/* @ds-bundle: {"format": 4, "namespace": "AvocatDS", "components": [{"name": "Icon"}, {"name": "Logo"}, {"name": "Button"}, {"name": "IconButton"}, {"name": "TextLink"}, {"name": "Field"}, {"name": "Input"}, {"name": "Textarea"}, {"name": "Select"}, {"name": "Combobox"}, {"name": "DatePicker"}, {"name": "Checkbox"}, {"name": "RadioGroup"}, {"name": "Switch"}, {"name": "FileDropzone"}, {"name": "Card"}, {"name": "KPICard"}, {"name": "DataTable"}, {"name": "StatusTag"}, {"name": "DeadlineItem"}, {"name": "Avatar"}, {"name": "Navbar"}, {"name": "ProductsMenu"}, {"name": "AppRail"}, {"name": "AppSidebar"}, {"name": "BottomNav"}, {"name": "AppShell"}, {"name": "Tabs"}, {"name": "Breadcrumbs"}, {"name": "Pagination"}, {"name": "Stepper"}, {"name": "UserProfilePanel"}, {"name": "Modal"}, {"name": "Drawer"}, {"name": "Toast"}, {"name": "Alert"}, {"name": "Tooltip"}, {"name": "Popover"}, {"name": "Skeleton"}, {"name": "Progress"}, {"name": "AIJobProgress"}, {"name": "EmptyState"}, {"name": "ToolCallBadge"}, {"name": "ContextChips"}, {"name": "CitationBlock"}, {"name": "AIDisclaimer"}, {"name": "AgentMessage"}, {"name": "AgentComposer"}, {"name": "AgentChat"}, {"name": "DocumentPreview"}, {"name": "DocumentCard"}, {"name": "PlanCard"}, {"name": "CreditsMeter"}, {"name": "CookieBanner"}, {"name": "Footer"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, Frag = React.Fragment;
  var ICONS = {"scale": "<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\" /> <path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\" /> <path d=\"M7 21h10\" /> <path d=\"M12 3v18\" /> <path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\" />", "gavel": "<path d=\"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8\" /> <path d=\"m16 16 6-6\" /> <path d=\"m8 8 6-6\" /> <path d=\"m9 7 8 8\" /> <path d=\"m21 11-8-8\" />", "landmark": "<line x1=\"3\" x2=\"21\" y1=\"22\" y2=\"22\" /> <line x1=\"6\" x2=\"6\" y1=\"18\" y2=\"11\" /> <line x1=\"10\" x2=\"10\" y1=\"18\" y2=\"11\" /> <line x1=\"14\" x2=\"14\" y1=\"18\" y2=\"11\" /> <line x1=\"18\" x2=\"18\" y1=\"18\" y2=\"11\" /> <polygon points=\"12 2 20 7 4 7\" />", "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\" /> <rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\" />", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />", "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />", "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" /> <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" />", "file-pen-line": "<path d=\"m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2\" /> <path d=\"M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\" /> <path d=\"M8 18h1\" />", "file-check-2": "<path d=\"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4\" /> <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /> <path d=\"m3 15 2 2 4-4\" />", "files": "<path d=\"M20 7h-3a2 2 0 0 1-2-2V2\" /> <path d=\"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z\" /> <path d=\"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8\" />", "folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\" />", "upload": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"17 8 12 3 7 8\" /> <line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\" />", "cloud-upload": "<path d=\"M12 13v8\" /> <path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /> <path d=\"m8 17 4-4 4 4\" />", "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"7 10 12 15 17 10\" /> <line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\" />", "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />", "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /> <path d=\"M20 3v4\" /> <path d=\"M22 5h-4\" /> <path d=\"M4 17v2\" /> <path d=\"M5 18H3\" />", "sparkle": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" />", "send": "<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /> <path d=\"m21.854 2.147-10.94 10.939\" />", "paperclip": "<path d=\"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48\" />", "x": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />", "check": "<path d=\"M20 6 9 17l-5-5\" />", "chevron-down": "<path d=\"m6 9 6 6 6-6\" />", "chevron-right": "<path d=\"m9 18 6-6-6-6\" />", "chevron-left": "<path d=\"m15 18-6-6 6-6\" />", "chevrons-up-down": "<path d=\"m7 15 5 5 5-5\" /> <path d=\"m7 9 5-5 5 5\" />", "arrow-right": "<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />", "arrow-left": "<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />", "plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />", "calendar-days": "<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" /> <path d=\"M8 14h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M16 14h.01\" /> <path d=\"M8 18h.01\" /> <path d=\"M12 18h.01\" /> <path d=\"M16 18h.01\" />", "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <polyline points=\"12 6 12 12 16 14\" />", "alarm-clock": "<circle cx=\"12\" cy=\"13\" r=\"8\" /> <path d=\"M12 9v4l2 2\" /> <path d=\"M5 3 2 6\" /> <path d=\"m22 6-3-3\" /> <path d=\"M6.38 18.7 4 21\" /> <path d=\"M17.64 18.67 20 21\" />", "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m9 12 2 2 4-4\" />", "circle-x": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m15 9-6 6\" /> <path d=\"m9 9 6 6\" />", "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />", "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />", "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 16v-4\" /> <path d=\"M12 8h.01\" />", "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />", "badge-check": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\" /> <path d=\"m9 12 2 2 4-4\" />", "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />", "lock-keyhole": "<circle cx=\"12\" cy=\"16\" r=\"1\" /> <rect x=\"3\" y=\"10\" width=\"18\" height=\"12\" rx=\"2\" /> <path d=\"M7 10V7a5 5 0 0 1 10 0v3\" />", "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />", "credit-card": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\" /> <line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\" />", "coins": "<circle cx=\"8\" cy=\"8\" r=\"6\" /> <path d=\"M18.09 10.37A6 6 0 1 1 10.34 18\" /> <path d=\"M7 6h1v4\" /> <path d=\"m16.71 13.88.7.71-2.82 2.82\" />", "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /> <path d=\"M21 3v5h-5\" /> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /> <path d=\"M8 16H3v5\" />", "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />", "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" />", "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />", "message-square": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" />", "wrench": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\" />", "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />", "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" /> <polyline points=\"16 17 21 12 16 7\" /> <line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\" />", "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" /> <path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />", "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />", "book-open": "<path d=\"M12 7v14\" /> <path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\" />", "graduation-cap": "<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\" /> <path d=\"M22 10v6\" /> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\" />", "mail": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" /> <path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\" />", "image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />", "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /> <path d=\"M12 11h4\" /> <path d=\"M12 16h4\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 16h.01\" />", "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"M18 17V9\" /> <path d=\"M13 17V5\" /> <path d=\"M8 17v-3\" />", "star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />", "save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\" /> <path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\" /> <path d=\"M7 3v4a1 1 0 0 0 1 1h7\" />", "trash-2": "<path d=\"M3 6h18\" /> <path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" /> <path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" /> <line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" /> <line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />", "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m4.9 4.9 14.2 14.2\" />", "package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /> <path d=\"m7.5 4.27 9 5.15\" />", "zap": "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />", "pen-line": "<path d=\"M12 20h9\" /> <path d=\"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z\" />", "inbox": "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\" /> <path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\" />", "scan-text": "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\" /> <path d=\"M17 3h2a2 2 0 0 1 2 2v2\" /> <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\" /> <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\" /> <path d=\"M7 8h8\" /> <path d=\"M7 12h10\" /> <path d=\"M7 16h6\" />", "quote": "<path d=\"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\" /> <path d=\"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\" />", "external-link": "<path d=\"M15 3h6v6\" /> <path d=\"M10 14 21 3\" /> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />", "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\" /> <circle cx=\"19\" cy=\"12\" r=\"1\" /> <circle cx=\"5\" cy=\"12\" r=\"1\" />", "filter": "<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\" />", "thumbs-up": "<path d=\"M7 10v12\" /> <path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\" />", "thumbs-down": "<path d=\"M17 14V2\" /> <path d=\"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z\" />", "hourglass": "<path d=\"M5 22h14\" /> <path d=\"M5 2h14\" /> <path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\" /> <path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\" />", "loader-circle": "<path d=\"M21 12a9 9 0 1 1-6.219-8.56\" />", "file-search": "<path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /> <path d=\"M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3\" /> <path d=\"m9 18-1.5-1.5\" /> <circle cx=\"5\" cy=\"14\" r=\"3\" />", "panel-left": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M9 3v18\" />", "house": "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />", "circle-help": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\" /> <path d=\"M12 17h.01\" />", "languages": "<path d=\"m5 8 6 6\" /> <path d=\"m4 14 6-6 2-3\" /> <path d=\"M2 5h12\" /> <path d=\"M7 2h1\" /> <path d=\"m22 22-5-10-5 10\" /> <path d=\"M14 18h6\" />", "target": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <circle cx=\"12\" cy=\"12\" r=\"6\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" />", "megaphone": "<path d=\"m3 11 18-5v12L3 14v-3z\" /> <path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\" />", "flask-conical": "<path d=\"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2\" /> <path d=\"M8.5 2h7\" /> <path d=\"M7 16h10\" />", "shopping-cart": "<circle cx=\"8\" cy=\"21\" r=\"1\" /> <circle cx=\"19\" cy=\"21\" r=\"1\" /> <path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\" />", "banknote": "<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"M6 12h.01M18 12h.01\" />", "file-down": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" /> <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /> <path d=\"M12 18v-6\" /> <path d=\"m9 15 3 3 3-3\" />", "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\" /> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\" /> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\" />", "user-round": "<circle cx=\"12\" cy=\"8\" r=\"5\" /> <path d=\"M20 21a8 8 0 0 0-16 0\" />", "chart-pie": "<path d=\"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z\" /> <path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\" />", "scroll-text": "<path d=\"M15 12h-5\" /> <path d=\"M15 8h-5\" /> <path d=\"M19 17V5a2 2 0 0 0-2-2H4\" /> <path d=\"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3\" />"};
  var MARKS = {"ink": "data:image/png;base64,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", "cream": "data:image/png;base64,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", "gold": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ4AAACaCAYAAABYFPFtAAAYU0lEQVR42u1de7Be1VX/7X2+JISQB5AAaaC0IA+T0JLSNiCdtEBs09ZxWujDUmttB0Wr4+gfyow6atUZbafWf3SmajuKWl9YFdFKOymoVIsgtRQKRcHWtKZAhdCEpAn3nr39Y+/D3Xfdtfbe57s3N+ex18w3yb33+863zz5rr/f6LXX7r29FoULLTbpsQaElIkX+jdJE+P1JACryOxu8VPC7nMUAwAr/fuNfilzPBp9pPmfI3yC8j66p+bn5vCbfQzfJkutaZh2WfBe9Fsi6DHMfYO7HEAFgyHeHAsIK626uqcm+WuFZmJYCKLw2dw0r7Fvz/ZV//yyAGQBWYrzPADiTbJhlNpEuyAS/r8j7GkaumQ2JMReCBwmGAejmcAdCk4dRMZ+lG2gDpq0JQ9H3a/IZjilrACvJPin/MBT53ophco5RDXP4wmdhCFPSvamE52kEIRJeow5+XzPPMdyvVf7fWwH8CoADEuOdDeCsYBE62HBNLq4F6aTIl4N5QPTkGEHSNjenCbMb4Tp03SFzGLJukIdjmIPRrMsGf7fkHi2zP5bcd0XWqQRpyDGtJnvJHSxFmCE8SBX5jpowHt0DzTybRkta5nBbsg56nxMApzdrlBhvvV+UDi42YU50yGAVOckgJ4s7vSDqAcxGILg+fbgVozZ18J30u8EwnCQ1Q6avgr9pQeLG1BQn+akkMsK1VbBHIUNpRtKFTDwRNAf9DJV6IV/QdVthz0JGq5hn1hzWo82aJN0+w6gEMKcSjA3E6X/LfM4y7zGCmrGRjTPMAwRj51hBncfep4J1xa4BwV6l19CC3SxJO25dnLSGcH0tMD8E+4zTaPRQq8jhUoyUp+aYjUk8S7j8OQBfBHCYqBp6wfABTcj1akHaKIZxOSNVR5wb6WfO0QntER05QDpiyCuBeRuVEjMBLHPPitlTTgvowLaizkSuw6cFYSF5pZK2sGTNdP83Adgu2PMi4ylmIR8C8IDg3SHiRUl2C4TNkphHRU5rG3ffCCrfJh6EzVgPGGa2ESkh3Qt9v2Eero3cR2yPYwwak2acGRJ7jtcB+NXgkIWCI8l4oTu8D8AjGSeqUCEAeFKwo8X4DbVrYqepUKGYUwXJxtYJQ1GybQoVyjVtWNNJ8moNo3JtkXiFpmA8zfHPJFNMlpxuocVIvAVZE51gvGLbFVoKW2+BupUYr8pwvQsVynEuVBvGk+JUxbkolEucnzCbo2q5lFKRfIXQstbTtikE5SLoRdoVWoyNp0JnVmdWVujCeIUWEU5BbjglZiAWKtRW4i0omIgFkFVRtYWW0Ludx2860otRpF2hpQynqNwmD5tRAlSohJty9mSBhyvZeLNC6qwQTysBnArXIHUIwFfKlsSTD5NIDKZUo8gBdQ3ghXANUS8GsBmu2vZlcHVoe4SysrE7GEmJJ1UKj13lbgbwcgC7AGz1P18AYA1JiF8B4F8Kvy1oTa1TFchGqKMaM9O9EMDPAdgN4AV+75RgkryrMJ7Y/4yc0ndd7Lvn6SIAb/fSLdZMPgvgNQBOBnCk2Hjz9ur5w6pblC2PmVYB2AZgnZBKpPbfGZ5JC82hJWRVp6hiz4E2uO9hmrql3tpTALweDi+mhJZaFIKaWC3VCOli71AYxMFwQhPlAu/plozF/B7qrCIBqWd2bPQ6OAQtlXG6m/+fA+Dycmjn8Y9O2XhVpAl7TKqiufc3RhqYuXpFBWADgJ0AThvpPnIN5HUKO8UUSfc8ne8di1QPimKAdnYA+I6RO2gsvIbOPPVqxOrhB4MeFB0BEeJoG4ALR9qlRzFaVE51iirNPlDeK32P4HTFcGZCm+ZauIAzRtpzUU2DgTxmj9Z6G21LBhJpDALsSrjUmh5xOEXlQFhQ8ThmO+/aiBZQiW685u+bPAMblLq8ZDhFlxwtTvLSqo54szFMufAQv7mEU/IknmagWMembi/3KlJFDmas9TMEOtrpr4WRZzBaQVgYBj0SIwkan0qwhW0QjzLE61cRuLeVAG4YWYWznjacMmZVexZcUecqZoaDFkYfxMq+KwDvXYLcre2hV0ujBCoXBWpMPbXNfW4HcG5gYlCc56f8y2Y2wisALxqprRc6X8nMxVgxU5rY2zYmjBLuxQNwQ2gMg3AvVawA4yqVstP01Y45TbbRq9mTI20A9wH4RMt5Xk1c8PwROxV6GuyUsdDZAC6JZG4MXFn7PwozKWJe7ilw5VVjK4taUHCiE3rZjszO014ivUTYMA3gGwAe8zbeF5g9UxFgyzUA3jDiQlDkQliMTeWuheuXqASp30i7A/7nvxIOrAT/UcG1Q24duZORDCDrkdl86wC8ShgP1fz7bwC+Bde4chuAg5HZaJy5sgWu/VGNbNwAwgOtW3DqGJjvxd6jlVTm/wF4GG4Y3Kz/+YHE5B56jTMAXAUXnB6TpLNtq1PGpG53CVMRmw18CPPhKZ4FcEdmi0B4ve2YKxAdUzW3TcXx1EghaN8cqSKxcIME9wX7cdQz3mNMNCDWAnkhgJdixF1oqTieZsZUDvVEnu2ZQQlxqBk4XJQjxNl4DMC/R8qkuEO72qvbjSPgLdUWA1mNaJSUBfA+kiKjkfeve4lH6RtwAeWZxMxb6h3vhssJj0Go2TaFoGOx8xpQ6OuZceYh4zwO4EFhr+4B8ChTHCANj27muV42YG1iYuNNczMXZuDS7hK4ogAp8j4TOBac9H/E236x+bOasaGvG7A2MdNkLvTIxkpdm8ixHoaL30n78LgPq3xb+Ls0N+SKAatbO00hqIlMYR6iLXJNZKq2hQsY35m4zmcBPN1yYvgpXuqNpa+2FQby0EMpO+Gw72KN2vsB/HfkACofVnk8EnxWQt77ppFkMHQOhMWCNw5Y4u30kkfqj9UA/ilhcli4YPJXBegPKS6q4Xpurxm4d2sp4JEe+YCVk+Bys2sSmIB3ZF7vz4W9MkL6qHkg14+gOkVPY+MNVdrtgMsiVJG42yEAd2Ve79Nwcb1UoUDInAYOS2/jQBnPtMnVqkSH/FBUwGVwGQuuEqeRRrcBeC7zmocA/CETOolVrWiv6l+HcaDlZ/fVDrH3QsFViezEHLysZbI2GsDvt7z27zIMHIsOWLgU2usHplkUs591ivFqoUDADugENrlZHcE9+RaAvS2v/1W41Fpue6gOGoxeMoIS+Ky+WsWMHxhKXOlcuIwFl9xv3vOpKb/jr5mshY0MHVHeu9010EHJISJFdgXy0MIpCq4Ic3cCcFy3cCoofcrbhVLTD7WjjV/Tdsx1t/WdZoRiAbQZN6AGJvrXYg6fWKo5PADXSaamYOxHAdwvqHEVKRC9FA7oe6gwZfU0EBZ2YPCy2yPo9hqu1OnAlAfvWa9ukVlW1nznRV79TwY4RE+18WqlLEbf6epgyowSPPn74YoD2h46C1eZ/B8AjmW0iIamzHq4woENA3UqkownfWAoUu97vdhXQqbiKIB7veSa1mv+GoDPZ4D6hBrFwLVXnolhoufbthAWQ/JqLwDwnZE0oIJr1P7yIusQ/wfzB+mZTLV0oX+pAc4ys7mFoEOkH4pkFhqpcz8WFna2VTHPegZ+mgmpqERw+bqB2HkiX+UUgg7JsVgN4J2RzILydt3DcMHjxdK9cJXLUiBeaqTaFoBCtlVnXZ5Xq3IyF0OUgFeCh/4PGaOxzZbisP2Xv9axRL8tfUgXeVuPS1lW/rUi+HfSceGwoKl7gryq0aFIvLcJB0kHB+5rXkotlWd3D4B3wOWGw++dBfAEXJHpEf/vM3DoBBsAvNX/u9n/OwleJvCSV8K1WH4QrvS+F6jvqdHwOgDwwQBmzu4UIFKbDTrmpdRTS/i9d/jXaXAlU/8LV838BIDz4ALGjSSe9a9VnuF2efNgBdNyiqD7bV8HG7KUECTPYjwag+pzQehrMNdYI0GKHQJw9xJv/pNwY6kAV4b1fQB+3DPdSq8uNVM4aTCXPjOk5/frAG4B8EkAn/MHZrbjkm5e5mKSqE4ZUv/FlV56xA7PQcwvc18Mw53kXxd7L/U6OBxkQxDjY6ZO7V8zcFUvtwH4G++09C1zgRyJVw3MxlsP4JWe8WxkCPRXvCqcljbABX/Phxs1erVntrDvgJuToYTS+6NwbZV/4KXbgeD59CW2Spt9slRt42XN9ryp+wrPDBVTqqMCY/32KU/2Rq9Gr4IrPtglgFwqJsTQOBoH4SpaZgGcHqT0NsLFFQ9Eog7oeHnUgnbZSYux3n2m7d6+S0mIW1te9wy49Ntr4QC7t3j1aiLqxpJG8f1wMbtn/WdX+IfVeLBne4Z+EP2uf5yHkD/JbMTtM+Ntgqv4OFkA0GlK3B8JemdT9AIAP+DV6fleKmmi/lRkT7/tQyeV93bXwJVqrWRU8XoA3+Wdicd7jijwvAk3yczVztPPPaNz4DCHwxmynJ13M/IyHz/iX+cEQdxmz6oIQlSjOY552229D5voSB9us/cXwFVMP9Eje9sSVWvb9tX2Gcai8mr2skg4qPEePxK5zkq4/ts7APwGHJrnyoBprFDO3oQQjgL4EIB3wwWI13km1ol9ba6zzd+HGkiZVFTVKglGtEd0GlyJuyISj9pa9xHjHUHD93lwU7p/GK4N0TCdaBwc2WHvJe8F8DEAX/K23Hu952uJtLMRmP4V3mn5Oy/1+mjjqRzGo96X6XEY5QqhNCfMzvwt+PKpPQB+0jOfyZg8rYLigDsB/IlnuOazR7wD86rI3DNJcu7x5sCTPRQAlvYXT1qi/PQtc7EVDskdkS6vWc8kzb2tBPBqAD8B4Lv9z5ap2OFUyL96Jv40XIsj/c7nAPyzl4TnBRJSJyBDGqjcV8NlVmZ75lQYWtc5aQlh0beTtjsDEeuLcEFj6z3fGwD8aBD3sxmbuw/ARz3TPRyJs1m4dNdd/vpc8FgLkrCGKxz4cE8YL9bBJzLeUNoamxL3inEEms3YG9h3vwfge7wtF+sIC0/yXgDvhyv6PJZxOL8JV7Hydu9gcH220hj6rZ5hH+xRX61hDtWgsVNeGsyctUyKqcnIfN4z2j1wqE1rE1gn4ZTum+CgJ+72nqvNhGi9z0tGy3jFIIcklBaTJZr0vdzhlAWJCJ2w7/rcV3sDFuLwUrX2Be9p3upDLrHcdMO4h+BSa5cC+M0p9+YhuDTYbCKxbpkH+K6elMVLWRuVw3h9LX1f66WXEsYnhIx0E1y6K2cqz34AvwWXtfjSIrTBYe+AfDND29AHeBr6gSxlp4Gi1T1XtVf5B5SCqNjh1bES7LlGRdc+RPIzAD4A18Cz2H250zsaMY2iBGiIG3vmWBgqxHTLkuW+qNzrI7WEIS5MFen9DOvmbocLIN/iVe1S0JM+/FJnqFn6IHcy4xH6IAFt24buPtXlnQfgFQnAnFQSP8xPvx+uJfL+41CO9BcBg+cedAVXVLC7Rymy7EHJfcZOuRKuINMIISKLPKjYxkH5ZRy/NNXdmBvAZ5nMhWK8WwWXQntrz5wLnQNTFqvS7fqNXs2ERCxJeZnIXItZuE6z9wH402VY90ci+fCwmyys8KjgqmNe2eHnUZPgt8lFi+pbIaiFKzOnlcYc3L8ElGjgoCd+Aa7c/OgyrPvjwfdYoQCB83I3YQ5qrQ+o763Ghtoezqw4N4HKJN27gmtr/ICXdMeWac1PY67BSAkhCMWEt071ZsXpfSuJijFe1UIiokMpmm2Y38KIxMDicGNqAD/vJdBzy7z2mxlYfprV4ByQVwB4eQ8kXjZ2Sh9Ros6FCwRPmAfHpaXCGN0MXLf/H+PEdOPf5VW8FE6xwuiCc7yUX9MD1PessaGGSTd1nV6EhajpKpIRQNBU89NwMbqjJ2jtBwD8A/OQtDA71waAP5fDNR11Vb1yAxmjNp5muBYdhqe4xEsAFQmRUOSiWbiBKB8/wes/6hlvhunfoHlmGna5Eq7msGvPJwphkQNTpnoAQ7sJrkrEMtW7EjRqDRdH+2CQAjuR0uExuOZtGj5RkcoVwFXWvBFzHWpdnVdr284ys5HAa1doC1yJuwlsN4n5VJDw/2248qQu0H5v69WZxnr48zVw/SFdRn1vPWBF9SC8cjXmRkNJbYLh748A+DM4WIiu9JMcgqsJ3M+oJpVIY16M7gaTbZt6vKpnOdrvZ9JKNtIrch9cm+Khjt3HQ3AzMmIRBS6tNoErYugqw9k24RTb8Xm1zU1QsGojeFShjfRLcNUhXaNH4cYUPJdoK+WcvbcEUr8LZBi4XdsGitZ21L5rbuJGApwtxZCa9/wR3MSertJn4AAcQcIm0qDlkClv7PiAlax5tX3I0a6G686HMMSEhiD2wRVzdpk+C4dKahMptPA5NZ7uOzok9RQTyNep0veKGXeEDqraN8DlKlWm6P81dB/45qB3emaYEJCNpPws3PyOPeheKtPmYqeYHjgVK+BKl+pIoWco5r8M1+fQB/rLhOMj5UEncADjGzpmEmmKCahbissu0VvgeiZyYl3KG+0He8J4+zE3K7dNFXiTQntTR0ves4boqQScxYnsSD/d23brWpTv7+1g+CR2n7cmhhdKoZaz4FogL+5YX212PV5Xx8KvhStf2sXYO5Yp7ERQ99YX6AcD4BNwlTKGjHzQCfAgBQcK9M6OORoqBxHUdhT56Ty4QOm7MT83qSKgPAhgYyc9YT4dzENbRZitFjIZIdZwBeDHvINyM+ZKrk50Q7fOwcc70YHjpptqM1w5+1VwhQCXRILbXLl1I/neA+A/4RqxD/uHYjomESbeaTrTq8r1EZVqE9BmawH8LBziwS3+3h/1zFx3dcDKck9zbDbstXAVtc2ciI2e6bbB4Q43VSVa6EOV8poKDkf4w967fQYuX3ssmKZTwcXQ7lxGk+FtXhKf7CX4an/fW7zjNGkpDCxjp7/Jh50e8K+n/P0/699/L9yQluNt75lcVWuXsR6vAaT5RTiwnWZtFZkzpoWpPFGcjsC+2AGHkVITIJ+mm+t3lpHxLgXwU3C1dFWgInUCAF1qg4xJwom/75f5ez0Kl5bTcE1Nn1tutTvJxDMzyxSX2xxAdykmnmgSo61UZAigEoosFSkoXS5a5yXdKqHKOFbQahjH0CbUHALmXh3YjqcuY6NPUtU2YnEi3OTxOBHHAqaqCdJ82PMaZlZqpgVQRyShDqSdZhA5l9vxmAT3YhjMFkX+r8naNZkWVEdKqmoy0CVEoT+eRQKaMY+S4Nv1Mnm5zWbv8N95LICFpdNx6mBmgiEzFGaD+6qJG18ThyOUmpX/zHIGmD8JB7RYB0xVMz0vmmQAdMA4tOpjQv5mgs/Nkmta8p3HezS8DQ/2pEUt1XLQM1iIjDTtOrqO12y9gT9UsjE44xQUrepqQ/Bx+kyh4wtTpnNR39HDxu5C3W/szsLHA4YxobvQictcqDa5Wk3KyQvzFVoM46mclJkWihALFcIUMGUmtx7PROraChWaBjsl28aTBowUKoQpAsnIhbBQRc0WWiKJZ9uMG8AApvsU6k7JF3KxU0xs3mihQlPE70zOnAvdU4DGQt1t6E721WpSglQkXqHFQFjYXFVLy6gL0xXClH0j7Fy8oQ7RK4ROFXYoGi3RiwkCFiqUGb8zuYigOtHDUKhQGydD53aZ1QKaY1G5hdp6taZtOAUJcMBChdpmMCa5Nl7J0RZarFeruFRsqSwutNy9F9kl7UXaFVrKZp8kFC0NHpuyl4UiAOCKeLHcfOA6p8sMpJH4rmD2l5QSgdCtz+FotMHgSw15MRmQa819zfi1LUVs0iC/WNZmjKMHg5hA709CSZCa2LnskxXAvFWkDaJ5btWUTd1oA1OmBMj4FNOlGFOKEdZMnphujHTdOjEwjyIPIDF2KtWnK2V3dOIeVWSkAxJYfxxMWS4DVEx0gu6TEfL14XgrwzClIQgHdCC1otjaugW2mWIulCqPV5nSQDGMFYsjxkZSKiZoGR1hGZE8KfvWZoIeSSDmsfXEZlwgko5Swr5bZi6dzRQM0u8UQXmwzMw1RRhT7Ktt4CAqAVI0JvZTwDnhSdKR5l/FoFxyf5OQo2Lrin23BL2gI1gsNiO9qDIYhxtbrwXUKLo/mrHLOTwZDkU0hLGoGDVvGVBIzQxQ4ToRQ4ybKmXjWTgY05XkgWsG8MUG9pL19pNm4jbUrquZtJxkz4SbPRvgh9Rk86jKqBiJHV5DMQYwIvYQmAPASTfDHFoqGXJGg9J70gGsR0XMi4rYYIpxBqmtRlVpRdavCQyuZVQ2p1pD8COK4dIAQ4o23t8vIX6KSqB3pr5HRTA4Fuuc2EVisKjI+tUi91AlUpZKmH2hEuDcdhGgOynUTyQ04fP+wSRjpFShQkuOd/P/uPR/tK20adoAAAAASUVORK5CYII="};
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  var uid = 0; function useId(p) { var r = useRef(null); if (!r.current) r.current = (p || 'av') + '-' + (++uid); return r.current; }

  /* ---------- Foundations ---------- */
  function Icon(p) {
    var size = p.size || 20, sw = p.strokeWidth || (size <= 16 ? 2 : 1.75);
    return h('svg', { className: cx('av-icon', p.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': p.label ? undefined : 'true', role: p.label ? 'img' : undefined,
      'aria-label': p.label, focusable: 'false', style: p.style, dangerouslySetInnerHTML: { __html: (p.label ? '<title>' + p.label + '</title>' : '') + (ICONS[p.name] || ICONS['circle-help']) } });
  }
  Icon.names = Object.keys(ICONS);

  function Logo(p) {
    var variant = p.variant || 'lockup', tone = p.tone || 'ink', size = p.size || 32;
    var mark = h('img', { src: MARKS[tone], width: size, height: Math.round(size * 154 / 158), alt: variant === 'mark' ? 'Avocat' : '', style: { display: 'block' } });
    if (variant === 'mark') return mark;
    var color = tone === 'cream' ? 'var(--neutral-50)' : tone === 'gold' ? 'var(--gold-500)' : 'var(--neutral-900)';
    var word = h('span', { style: { font: '600 ' + Math.round(size * 0.72) + 'px/1 var(--font-display)', letterSpacing: '0.14em', color: color, paddingTop: 2 } }, 'AVOCAT');
    if (variant === 'wordmark') return word;
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.32) }, role: 'img', 'aria-label': 'Avocat' }, mark, word);
  }

  /* ---------- Actions ---------- */
  function Button(p) {
    var v = p.variant || 'primary', s = p.size || 'md';
    var Tag = p.href ? 'a' : 'button';
    return h(Tag, { className: cx('av-btn', 'av-btn--' + v, s !== 'md' && 'av-btn--' + s, p.block && 'av-btn--block', p.className), href: p.href,
      type: Tag === 'button' ? (p.type || 'button') : undefined, disabled: Tag === 'button' ? (p.disabled || p.loading) : undefined,
      'aria-disabled': p.disabled ? 'true' : undefined, 'aria-busy': p.loading ? 'true' : undefined, onClick: p.onClick, style: p.style },
      p.loading ? h(Icon, { name: 'loader-circle', size: s === 'sm' ? 16 : 18, className: 'av-spin' }) : p.icon && h(Icon, { name: p.icon, size: s === 'sm' ? 16 : 18 }),
      p.loading && p.loadingText ? p.loadingText : p.children,
      p.iconRight && h(Icon, { name: p.iconRight, size: s === 'sm' ? 16 : 18 }));
  }
  function IconButton(p) {
    var v = p.variant || 'ghost', s = p.size || 'md';
    return h('button', { type: 'button', className: cx('av-btn', 'av-iconbtn', 'av-btn--' + v, s !== 'md' && 'av-btn--' + s, p.className), 'aria-label': p.label,
      title: p.label, disabled: p.disabled, 'aria-pressed': p.pressed, onClick: p.onClick }, h(Icon, { name: p.icon, size: s === 'sm' ? 16 : 20 }));
  }
  function TextLink(p) {
    return h('a', { className: cx('av-link', p.quiet && 'av-link--quiet'), href: p.href || '#', target: p.external ? '_blank' : undefined, rel: p.external ? 'noopener noreferrer' : undefined },
      p.children, p.external && h(Frag, null, ' ', h(Icon, { name: 'external-link', size: 14 }), h('span', { className: 'av-sr' }, '(se abre en una pestaña nueva)')));
  }

  /* ---------- Forms ---------- */
  function Field(p) {
    var autoId = useId('f'); var id = p.id || autoId;
    var help = p.help && id + '-help', err = p.error && id + '-err';
    var control = typeof p.children === 'function' ? p.children({ id: id, 'aria-describedby': cx(help, err) || undefined, 'aria-invalid': p.error ? 'true' : undefined, required: p.required }) : p.children;
    return h('div', { className: cx('av-field', p.className) },
      h('label', { className: 'av-label', htmlFor: id }, p.label, p.required ? h('span', { className: 'av-req', 'aria-hidden': 'true' }, '*') : p.optional ? h('span', { className: 'av-opt' }, ' (opcional)') : null),
      control,
      p.help && !p.error && h('div', { className: 'av-help', id: help }, p.help),
      p.error && h('div', { className: 'av-error', id: err }, h(Icon, { name: 'circle-alert', size: 16 }), p.error));
  }
  function Input(p) {
    var el = h('input', { id: p.id, className: cx('av-input', p.icon && 'av-has-left', p.iconRight && 'av-has-right'), type: p.type || 'text', placeholder: p.placeholder,
      defaultValue: p.defaultValue, value: p.value, onChange: p.onChange, disabled: p.disabled, required: p.required, inputMode: p.inputMode, autoComplete: p.autoComplete,
      'aria-invalid': p['aria-invalid'], 'aria-describedby': p['aria-describedby'], readOnly: p.readOnly, onFocus: p.onFocus, onKeyDown: p.onKeyDown, role: p.role,
      'aria-expanded': p['aria-expanded'], 'aria-controls': p['aria-controls'], 'aria-autocomplete': p['aria-autocomplete'], 'aria-activedescendant': p['aria-activedescendant'] });
    if (!p.icon && !p.iconRight) return el;
    return h('div', { className: 'av-inputwrap' }, p.icon && h(Icon, { name: p.icon, size: 18 }), el, p.iconRight && h(Icon, { name: p.iconRight, size: 18, className: 'av-right' }));
  }
  function Textarea(p) {
    return h('textarea', { id: p.id, className: 'av-textarea', rows: p.rows || 4, placeholder: p.placeholder, defaultValue: p.defaultValue, disabled: p.disabled,
      'aria-invalid': p['aria-invalid'], 'aria-describedby': p['aria-describedby'], maxLength: p.maxLength });
  }
  function Select(p) {
    return h('div', { className: 'av-inputwrap' },
      h('select', { id: p.id, className: 'av-select', defaultValue: p.defaultValue || '', disabled: p.disabled, 'aria-invalid': p['aria-invalid'], 'aria-describedby': p['aria-describedby'], required: p.required },
        p.placeholder && h('option', { value: '', disabled: true }, p.placeholder),
        (p.options || []).map(function (o) { return h('option', { key: o.value || o, value: o.value || o }, o.label || o); })),
      h(Icon, { name: 'chevron-down', size: 18, className: 'av-right' }));
  }
  var COUNTRIES = [
    { value: 'AR', label: 'Argentina' }, { value: 'BO', label: 'Bolivia' }, { value: 'CL', label: 'Chile' }, { value: 'CO', label: 'Colombia' },
    { value: 'CR', label: 'Costa Rica' }, { value: 'EC', label: 'Ecuador' }, { value: 'ES', label: 'España' }, { value: 'MX', label: 'México' },
    { value: 'PA', label: 'Panamá' }, { value: 'PE', label: 'Perú' }, { value: 'DO', label: 'República Dominicana' }, { value: 'UY', label: 'Uruguay' }];
  function Combobox(p) {
    var opts = p.options || COUNTRIES;
    var st = useState(p.defaultValue ? (opts.find(function (o) { return o.value === p.defaultValue; }) || {}).label : ''), q = st[0], setQ = st[1];
    var so = useState(!!p.defaultOpen), open = so[0], setOpen = so[1];
    var sa = useState(0), act = sa[0], setAct = sa[1];
    var lid = (p.id || 'cb') + '-list';
    var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var list = opts.filter(function (o) { return !q || norm(o.label).indexOf(norm(q)) === 0 || open && q === (opts.find(function (x) { return x.label === q; }) || {}).label; });
    if (list.length === 0) list = [];
    function key(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAct(Math.min(act + 1, list.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(Math.max(act - 1, 0)); }
      else if (e.key === 'Enter' && open && list[act]) { e.preventDefault(); setQ(list[act].label); setOpen(false); }
      else if (e.key === 'Escape') setOpen(false);
    }
    return h('div', { className: 'av-inputwrap', style: { position: 'relative' } },
      h(Icon, { name: p.icon || 'globe', size: 18 }),
      h('input', { id: p.id, className: 'av-input av-has-left av-has-right', role: 'combobox', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': lid,
        'aria-autocomplete': 'list', 'aria-activedescendant': open && list[act] ? lid + '-' + list[act].value : undefined, value: q, placeholder: p.placeholder || 'Escribe o elige tu país',
        'aria-invalid': p['aria-invalid'], 'aria-describedby': p['aria-describedby'], autoComplete: 'country-name',
        onChange: function (e) { setQ(e.target.value); setOpen(true); setAct(0); }, onFocus: function () { setOpen(true); }, onKeyDown: key }),
      h(Icon, { name: 'chevrons-up-down', size: 18, className: 'av-right' }),
      open && h('ul', { className: 'av-listbox', id: lid, role: 'listbox', 'aria-label': p.listLabel || 'Países' },
        list.length ? list.slice(0, 7).map(function (o, i) {
          var sel = o.label === q;
          return h('li', { key: o.value, id: lid + '-' + o.value, role: 'option', 'aria-selected': sel ? 'true' : 'false', className: cx('av-option', i === act && 'av-active'),
            onMouseDown: function (e) { e.preventDefault(); setQ(o.label); setOpen(false); } }, o.label, sel && h(Icon, { name: 'check', size: 16, className: 'av-check' }));
        }) : h('li', { className: 'av-option', role: 'option', 'aria-disabled': 'true' }, 'Sin resultados. ¿Tu país no está? Escríbenos.')));
  }
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function DatePicker(p) {
    var init = p.month || [2026, 10];
    var sm = useState(init), ym = sm[0], setYm = sm[1];
    var ss = useState(p.selected || null), sel = ss[0], setSel = ss[1];
    var y = ym[0], m = ym[1];
    var first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
    var cells = [];
    for (var i = 0; i < 42; i++) { var d = i - first + 1; cells.push(d < 1 ? { d: prevDays + d, out: true } : d > days ? { d: d - days, out: true } : { d: d }); }
    var rows = []; for (var r = 0; r < 6; r++) rows.push(cells.slice(r * 7, r * 7 + 7));
    var marks = p.deadlines || [];
    return h('div', { className: 'av-cal', role: 'dialog', 'aria-label': 'Elegir fecha de vencimiento' },
      h('div', { className: 'av-cal__head' },
        h(IconButton, { icon: 'chevron-left', label: 'Mes anterior', size: 'sm', onClick: function () { setYm(m === 0 ? [y - 1, 11] : [y, m - 1]); } }),
        h('span', { 'aria-live': 'polite' }, MONTHS[m] + ' ' + y),
        h(IconButton, { icon: 'chevron-right', label: 'Mes siguiente', size: 'sm', onClick: function () { setYm(m === 11 ? [y + 1, 0] : [y, m + 1]); } })),
      h('table', { role: 'grid' },
        h('thead', null, h('tr', null, ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(function (x, i) { return h('th', { key: i, scope: 'col', abbr: ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'][i] }, x); }))),
        h('tbody', null, rows.map(function (row, ri) {
          return h('tr', { key: ri }, row.map(function (c, ci) {
            var isSel = !c.out && sel === c.d, today = !c.out && c.d === (p.today || 11);
            return h('td', { key: ci }, h('button', { type: 'button', className: cx(c.out && 'av-out', today && 'av-today'), 'aria-selected': isSel ? 'true' : undefined,
              tabIndex: isSel || (!sel && today) ? 0 : -1, 'aria-label': c.d + ' de ' + MONTHS[m] + (today ? ', hoy' : '') + (!c.out && marks.indexOf(c.d) >= 0 ? ', tiene vencimientos' : ''),
              onClick: function () { if (!c.out) setSel(c.d); } }, c.d, !c.out && marks.indexOf(c.d) >= 0 && h('span', { className: 'av-dot' })));
          }));
        }))),
      p.footer !== false && h('div', { className: 'av-row', style: { justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' } },
        h('span', null, 'Días hábiles · festivos nacionales'), h(Button, { size: 'sm', variant: 'ghost', onClick: function () { setSel(p.today || 11); } }, 'Hoy')));
  }
  function Checkbox(p) {
    return h('label', { className: 'av-choice' }, h('input', { type: 'checkbox', defaultChecked: p.checked, disabled: p.disabled, required: p.required, 'aria-invalid': p.invalid }),
      h('span', null, p.label, p.hint && h('small', null, p.hint)));
  }
  function RadioGroup(p) {
    var name = useId('rg');
    return h('fieldset', { style: { border: 0, padding: 0, margin: 0 }, className: 'av-col' },
      h('legend', { className: 'av-label', style: { marginBottom: 8 } }, p.legend),
      (p.options || []).map(function (o) {
        return h('label', { key: o.value, className: 'av-choice' }, h('input', { type: 'radio', name: name, value: o.value, defaultChecked: p.defaultValue === o.value, disabled: o.disabled }),
          h('span', null, o.label, o.hint && h('small', null, o.hint)));
      }));
  }
  function Switch(p) {
    var s = useState(!!p.checked), on = s[0], set = s[1];
    var id = useId('sw');
    return h('div', { className: 'av-switch' },
      h('button', { type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-labelledby': id, onClick: function () { set(!on); }, disabled: p.disabled }),
      h('span', { id: id, onClick: function () { set(!on); } }, p.label));
  }
  function FileDropzone(p) {
    var state = p.state || 'idle';
    return h('div', { className: 'av-col' },
      state === 'idle' || state === 'drag' ? h('div', { className: cx('av-dropzone', state === 'drag' && 'av-drag') },
        h(Icon, { name: 'cloud-upload', size: 28, style: { color: 'var(--accent-text)' } }),
        h('strong', null, state === 'drag' ? 'Suelta el archivo para subirlo' : 'Arrastra aquí tu PDF o '), state !== 'drag' && h('span', null, h('button', { type: 'button', className: 'av-link', style: { background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' } }, 'selecciónalo en tu equipo')),
        h('span', { className: 'av-help' }, p.accept || 'PDF, DOCX o imagen · máx. 20 MB · hasta 10 archivos'))
      : h('div', { className: 'av-file' },
        h('div', { className: 'av-doccard__icon', style: { width: 36, height: 44 } }, h(Icon, { name: state === 'error' ? 'circle-alert' : 'file-text', size: 20, style: state === 'error' ? { color: 'var(--danger-text)' } : null })),
        h('div', { className: 'av-file__meta' },
          h('div', { className: 'av-file__name' }, p.fileName || 'contrato_arrendamiento_2025.pdf'),
          state === 'uploading' && h(Frag, null, h('div', { className: 'av-help' }, 'Subiendo… 64 % · 2,1 de 3,3 MB'), h(Progress, { value: 64, label: 'Subida' })),
          state === 'ocr' && h(Frag, null, h('div', { className: 'av-help', 'aria-live': 'polite' }, 'Leyendo texto (OCR)… página 4 de 12'), h(Progress, { value: 33, label: 'Reconocimiento de texto' })),
          state === 'done' && h('div', { className: 'av-help', style: { color: 'var(--success-text)' } }, h(Icon, { name: 'circle-check', size: 14 }), ' 12 páginas leídas · 4 partes, 9 fechas y 3 riesgos detectados'),
          state === 'error' && h('div', { className: 'av-error', role: 'alert' }, 'No hemos podido leer el archivo: el PDF está protegido con contraseña.')),
        state === 'error' ? h(Button, { size: 'sm', variant: 'secondary', icon: 'rotate-ccw' }, 'Reintentar') : h(IconButton, { icon: 'x', label: 'Quitar archivo', size: 'sm' })),
      p.privacy !== false && h('p', { className: 'av-privacy', style: { margin: 0 } }, h(Icon, { name: 'lock', size: 16 }),
        h('span', null, 'Tus documentos se cifran y solo los ves tú. No se usan para entrenar modelos. ', h(TextLink, { href: '#', quiet: true }, 'Cómo tratamos tus datos'))));
  }

  /* ---------- Data display ---------- */
  function Card(p) {
    var Tag = p.href ? 'a' : (p.as || 'section');
    return h(Tag, { className: cx('av-card', p.variant && 'av-card--' + p.variant, p.padding === 'sm' && 'av-card--sm', p.href && 'av-card--interactive', p.className), href: p.href, style: p.style, 'aria-labelledby': p.titleId },
      (p.title || p.actions) && h('div', { className: 'av-card__head' }, p.title && h('h3', { className: 'av-card__title', id: p.titleId }, p.title), p.actions),
      p.children);
  }
  function KPICard(p) {
    var t = p.trend, dir = t == null ? null : t > 0 ? 'up' : t < 0 ? 'down' : 'flat';
    if (p.loading) return h('div', { className: 'av-kpi', 'aria-busy': 'true' }, h(Skeleton, { width: 90, height: 12 }), h(Skeleton, { width: 70, height: 34 }), h(Skeleton, { width: 120, height: 12 }));
    return h('div', { className: 'av-kpi' },
      h('div', { className: 'av-kpi__label' }, h('span', null, p.label), p.icon && h(Icon, { name: p.icon, size: 18 })),
      h('div', { className: 'av-kpi__value' }, p.value),
      dir && h('div', { className: cx('av-kpi__trend', p.goodWhen === 'down' ? (dir === 'down' ? 'av-up' : dir === 'up' ? 'av-down' : '') : (dir === 'up' ? 'av-up' : dir === 'down' ? 'av-down' : '')) },
        h(Icon, { name: dir === 'up' ? 'chevron-right' : 'chevron-right', size: 14, style: { transform: dir === 'up' ? 'rotate(-90deg)' : dir === 'down' ? 'rotate(90deg)' : 'none' } }),
        h('b', null, (t > 0 ? '+' : '') + t + ' %'), h('span', null, p.trendLabel || 'vs. mes anterior')));
  }
  var STATUS = {
    'vencido': { label: 'Vencido', icon: 'circle-x' }, 'urgente': { label: 'Urgente', icon: 'alarm-clock' }, 'proximo': { label: 'Próximo', icon: 'clock' },
    'a-tiempo': { label: 'A tiempo', icon: 'circle-check' }, 'borrador': { label: 'Borrador', icon: 'file-pen-line' }, 'en-revision': { label: 'En revisión', icon: 'eye' },
    'presentado': { label: 'Presentado', icon: 'send' }, 'pagado': { label: 'Pagado', icon: 'badge-check' } };
  function StatusTag(p) {
    var s = STATUS[p.status] || {};
    return h('span', { className: cx('av-tag', p.size === 'sm' && 'av-tag--sm'), style: { '--tag-bg': 'var(--status-' + p.status + '-bg)', '--tag-fg': 'var(--status-' + p.status + '-fg)', '--tag-border': 'var(--status-' + p.status + '-border)' } },
      h(Icon, { name: s.icon, size: p.size === 'sm' ? 12 : 14, strokeWidth: 2 }), p.children || s.label);
  }
  StatusTag.statuses = Object.keys(STATUS);
  function Tag(p) { return h('span', { className: cx('av-tag', 'av-tag--' + (p.tone || 'neutral'), p.size === 'sm' && 'av-tag--sm') }, p.icon && h(Icon, { name: p.icon, size: 14, strokeWidth: 2 }), p.children); }
  function deadlineStatus(days) { return days < 0 ? 'vencido' : days <= 3 ? 'urgente' : days <= 7 ? 'proximo' : 'a-tiempo'; }
  function DeadlineItem(p) {
    var st = deadlineStatus(p.daysLeft);
    var rel = p.daysLeft < 0 ? 'Venció hace ' + (-p.daysLeft) + (p.daysLeft === -1 ? ' día' : ' días') : p.daysLeft === 0 ? 'Vence hoy' : p.daysLeft === 1 ? 'Vence mañana' : 'Vence en ' + p.daysLeft + ' días';
    return h('a', { className: 'av-deadline', href: p.href || '#' },
      h('div', { className: 'av-deadline__date', 'aria-hidden': 'true' }, h('b', null, p.day), h('span', null, p.month)),
      h('div', { className: 'av-deadline__body' }, h('div', { className: 'av-deadline__title' }, p.title), h('div', { className: 'av-deadline__meta' }, p.meta)),
      h('span', { className: 'av-sr' }, rel + '.'),
      h(StatusTag, { status: st, size: 'sm' }, p.daysLeft < 0 ? 'Vencido' : p.daysLeft === 0 ? 'Hoy' : p.daysLeft === 1 ? 'Mañana' : p.daysLeft + ' días'));
  }
  function DataTable(p) {
    return h('div', { className: cx('av-tablewrap', 'av-tablewrap--stack') },
      h('table', { className: 'av-table' },
        p.caption && h('caption', null, p.caption),
        h('thead', null, h('tr', null, p.columns.map(function (c) {
          return h('th', { key: c.key, scope: 'col', className: c.num ? 'av-num' : null, 'aria-sort': c.sort || undefined },
            c.sortable ? h('button', { type: 'button' }, c.label, h(Icon, { name: 'chevrons-up-down', size: 14 })) : c.label);
        }))),
        h('tbody', null, p.rows.map(function (r, i) {
          return h('tr', { key: i }, p.columns.map(function (c, j) {
            var v = c.render ? c.render(r) : r[c.key];
            return j === 0 ? h('th', { key: c.key, scope: 'row', className: 'av-strong', style: { fontWeight: 500, background: 'none', position: 'static', fontSize: 14, color: 'var(--text-heading)', textTransform: 'none', letterSpacing: 0, padding: '12px 16px', borderTop: '1px solid var(--border)' } }, v)
              : h('td', { key: c.key, className: c.num ? 'av-num' : null }, v);
          }));
        }))),
      h('ul', { className: 'av-cardlist', 'aria-label': p.caption }, p.rows.map(function (r, i) {
        return h('li', { key: i }, h('b', { style: { color: 'var(--text-heading)' } }, p.columns[0].render ? p.columns[0].render(r) : r[p.columns[0].key]),
          h('div', { className: 'av-row', style: { gap: 8, fontSize: 13, color: 'var(--text-muted)' } }, p.columns.slice(1).map(function (c) { return h('span', { key: c.key }, c.render ? c.render(r) : r[c.key]); })));
      })));
  }
  function Avatar(p) {
    var size = p.size || 32;
    var initials = (p.name || '').split(' ').map(function (s) { return s[0]; }).slice(0, 2).join('').toUpperCase();
    return h('span', { className: cx('av-avatar', p.agent && 'av-avatar--agent'), style: { width: size, height: size, fontSize: Math.round(size * 0.4) }, role: 'img', 'aria-label': p.agent ? 'Avocat (asistente)' : p.name },
      p.agent ? h(Icon, { name: 'sparkle', size: Math.round(size * 0.5), strokeWidth: 1.75 }) : p.src ? h('img', { src: p.src, alt: '' }) : initials);
  }
  function Skeleton(p) { return h('span', { className: 'av-skel', 'aria-hidden': 'true', style: { display: 'block', width: p.width || '100%', height: p.height || 14, borderRadius: p.round ? '50%' : undefined } }); }
  function Progress(p) {
    return h('div', { className: cx('av-progress', p.value == null && 'av-progress--indet'), role: 'progressbar', 'aria-label': p.label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.value },
      h('i', { style: { width: (p.value || 0) + '%' } }));
  }

  /* ---------- Navigation ---------- */
  function Navbar(p) {
    var cur = p.current;
    var items = [{ k: 'abogados', l: 'Abogados', i: 'scale' }, { k: 'particulares', l: 'Particulares', i: 'user-round' }, { k: 'estudiantes', l: 'Estudiantes', i: 'graduation-cap' }, { k: 'precios', l: 'Precios' }, { k: 'nosotros', l: 'Nosotros' }];
    return h('header', { className: 'av-navbar' },
      h('a', { href: '#', 'aria-label': 'Avocat, ir al inicio' }, h(Logo, { size: 28 })),
      h('nav', { 'aria-label': 'Principal', className: 'av-navbar__links' },
        items.map(function (it) { return h('a', { key: it.k, className: 'av-navbar__link', href: '#', 'aria-current': cur === it.k ? 'page' : undefined }, it.l); })),
      h('div', { className: 'av-navbar__actions' },
        h(Button, { variant: 'ghost', size: 'sm', className: 'av-hide-sm' }, 'Iniciar sesión'),
        h(Button, { variant: 'primary', size: 'sm' }, 'Probar 14 días gratis'),
        h(IconButton, { icon: 'menu', label: 'Abrir menú', className: 'av-navbar__burger' })));
  }
  function ProductsMenu(p) {
    var items = [{ i: 'scale', t: 'Abogados y despachos', d: 'Casos, plazos, clientes y agente IA. 75 €/mes.' },
      { i: 'user-round', t: 'Particulares', d: 'Reclamaciones y tutelas en lenguaje claro. Desde 10 € por escrito.' },
      { i: 'graduation-cap', t: 'Estudiantes', d: 'Tutor socrático y plantillas. 3 € por escrito.' }];
    return h('div', { className: 'av-menu', role: 'menu', 'aria-label': 'Productos' },
      items.map(function (it) { return h('a', { key: it.t, href: '#', role: 'menuitem' }, h(Icon, { name: it.i, size: 20 }), h('div', null, h('b', null, it.t), h('span', null, it.d))); }),
      h('hr'), h('a', { href: '#', role: 'menuitem' }, h(Icon, { name: 'briefcase', size: 20 }), h('div', null, h('b', null, 'Empresas'), h('span', null, 'Equipos jurídicos y asesorías. Hablar con ventas.'))));
  }
  var RAIL = [{ i: 'layout-dashboard', l: 'Panel', k: 'panel' }, { i: 'sparkles', l: 'Agente IA', k: 'agente' }, { i: 'folder-open', l: 'Casos', k: 'casos' },
    { i: 'files', l: 'Documentos', k: 'documentos' }, { i: 'users', l: 'Clientes', k: 'clientes' }, { i: 'wrench', l: 'Herramientas', k: 'herramientas' }];
  function AppRail(p) {
    return h('nav', { className: 'av-rail', 'aria-label': 'Secciones' },
      h('a', { href: '#', 'aria-label': 'Avocat, ir al panel', style: { marginBottom: 12 } }, h(Logo, { variant: 'mark', tone: 'gold', size: 30 })),
      RAIL.map(function (it) { return h('a', { key: it.k, href: '#', className: 'av-rail__item', 'aria-current': p.current === it.k ? 'page' : undefined, 'aria-label': it.l, title: it.l }, h(Icon, { name: it.i, size: 20 })); }),
      h('div', { className: 'av-rail__spacer' }),
      h('button', { className: 'av-rail__item', 'aria-label': 'Notificaciones (3 nuevas)', title: 'Notificaciones' }, h(Icon, { name: 'bell', size: 20 })),
      h('button', { className: 'av-rail__item', 'aria-label': 'Perfil y ajustes', 'aria-haspopup': 'dialog' }, h(Avatar, { name: p.user || 'Lucía Martín', size: 28 })));
  }
  function AppSidebar(p) {
    var g = p.groups || [{ t: 'Casos', items: [{ i: 'folder-open', l: 'Todos los casos', c: 42, cur: true }, { i: 'alarm-clock', l: 'Urgentes', c: 3, hot: true }, { i: 'circle-x', l: 'Vencidos', c: 1, hot: true }, { i: 'circle-check', l: 'A tiempo', c: 38 }] },
      { t: 'Escritos', items: [{ i: 'file-pen-line', l: 'Generar escrito' }, { i: 'scan-text', l: 'Analizar documento' }, { i: 'shield-check', l: 'Auditoría legal' }] }];
    return h('nav', { className: cx('av-sidebar', 'av-collapsible'), 'aria-label': p.title || 'Casos' },
      h('div', { className: 'av-sidebar__title' }, p.title || 'Casos'),
      h(Button, { variant: 'accent', size: 'sm', icon: 'plus', block: true, style: { marginBottom: 8 } }, 'Nuevo caso'),
      g.map(function (grp) {
        return h(Frag, { key: grp.t }, h('div', { className: 'av-sidebar__group' }, grp.t),
          grp.items.map(function (it) {
            return h('a', { key: it.l, href: '#', className: 'av-sidebar__item', 'aria-current': it.cur ? 'page' : undefined }, h(Icon, { name: it.i, size: 18 }), it.l,
              it.c != null && h('span', { className: cx('av-count', it.hot && 'av-hot') }, it.c, h('span', { className: 'av-sr' }, ' casos')));
          }));
      }));
  }
  function BottomNav(p) {
    return h('nav', { className: 'av-bottomnav', 'aria-label': 'Secciones' }, RAIL.slice(0, 5).map(function (it) {
      return h('a', { key: it.k, href: '#', 'aria-current': p.current === it.k ? 'page' : undefined }, h(Icon, { name: it.i, size: 22 }), it.l);
    }));
  }
  function AppShell(p) {
    return h('div', { className: 'av-shell', 'data-theme': p.theme || 'dark', style: p.style },
      h(AppRail, { current: p.current }), p.sidebar !== false && h(AppSidebar, p.sidebarProps || {}),
      h('main', { className: 'av-main' }, p.title && h('header', { className: 'av-apphead' }, h('h1', null, p.title), p.actions), p.children, h(BottomNav, { current: p.current })));
  }
  function Tabs(p) {
    var s = useState(p.defaultValue || p.tabs[0].value), cur = s[0], set = s[1];
    var id = useId('tabs');
    function key(e, i) {
      var n = p.tabs.length, j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (j >= 0) { e.preventDefault(); set(p.tabs[j].value); var el = document.getElementById(id + '-t-' + p.tabs[j].value); el && el.focus(); }
    }
    var active = p.tabs.find(function (t) { return t.value === cur; });
    return h('div', null,
      h('div', { className: p.variant === 'segmented' ? 'av-segment' : 'av-tabs', role: 'tablist', 'aria-label': p.label },
        p.tabs.map(function (t, i) {
          return h('button', { key: t.value, id: id + '-t-' + t.value, className: 'av-tab', role: 'tab', 'aria-selected': cur === t.value ? 'true' : 'false', 'aria-controls': id + '-p',
            tabIndex: cur === t.value ? 0 : -1, onClick: function () { set(t.value); }, onKeyDown: function (e) { key(e, i); } }, t.icon && h(Icon, { name: t.icon, size: 18 }), t.label);
        })),
      h('div', { id: id + '-p', role: 'tabpanel', 'aria-labelledby': id + '-t-' + cur, tabIndex: 0, style: { paddingTop: 24 } }, active && active.panel));
  }
  function Breadcrumbs(p) {
    return h('nav', { className: 'av-crumbs', 'aria-label': 'Ruta' }, h('ol', null, p.items.map(function (it, i) {
      var last = i === p.items.length - 1;
      return h('li', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, last ? h('span', { 'aria-current': 'page' }, it) : h('a', { href: '#' }, it), !last && h(Icon, { name: 'chevron-right', size: 14 }));
    })));
  }
  function Pagination(p) {
    var page = p.page || 1, pages = p.pages || 5;
    var nums = []; for (var i = 1; i <= pages; i++) nums.push(i);
    return h('nav', { className: 'av-pager', 'aria-label': 'Paginación' },
      h('span', { className: 'av-summary' }, p.summary || 'Mostrando 1–10 de 42 casos'),
      h('button', { 'aria-label': 'Página anterior', disabled: page === 1 }, h(Icon, { name: 'chevron-left', size: 18 })),
      nums.map(function (n) { return h('button', { key: n, 'aria-current': n === page ? 'page' : undefined, 'aria-label': 'Página ' + n }, n); }),
      h('button', { 'aria-label': 'Página siguiente', disabled: page === pages }, h(Icon, { name: 'chevron-right', size: 18 })));
  }
  function Stepper(p) {
    var cur = p.current || 1;
    var list = h('ol', { className: cx('av-stepper', p.compact && 'av-stepper--compact'), 'aria-label': p.label || 'Progreso' }, p.steps.map(function (s, i) {
      var n = i + 1, st = n < cur ? 'done' : n === cur ? 'current' : 'todo';
      return h('li', { key: n, className: 'av-step', 'data-state': st, 'aria-current': st === 'current' ? 'step' : undefined },
        h('div', { className: 'av-step__bar' }),
        h('div', { className: 'av-step__label' }, h('span', { className: 'av-step__num' }, st === 'done' ? h(Icon, { name: 'check', size: 12, strokeWidth: 3 }) : n),
          h('span', { className: 'av-step__text' }, s), st === 'done' && h('span', { className: 'av-sr' }, ' (completado)')));
    }));
    if (!p.compact) return list;
    return h('div', { className: 'av-col', style: { gap: 8 } }, list,
      h('div', { className: 'av-help', 'aria-hidden': 'true' }, 'Paso ' + cur + ' de ' + p.steps.length + ' · ', h('b', { style: { color: 'var(--text-heading)' } }, p.steps[cur - 1])));
  }
  function UserProfilePanel(p) {
    return h('div', { className: 'av-profile', role: 'dialog', 'aria-label': 'Perfil' },
      h('div', { className: 'av-profile__head' }, h(Avatar, { name: p.name || 'Lucía Martín', size: 40 }),
        h('div', null, h('b', null, p.name || 'Lucía Martín'), h('span', null, p.email || 'lucia@martinabogados.es'))),
      h('div', { className: 'av-profile__section' }, h('div', { className: 'av-row', style: { justifyContent: 'space-between' } },
        h('span', { style: { fontSize: 13 } }, 'Plan ', h('b', null, 'Abogados')), h(Tag, { tone: 'accent', size: 'sm' }, 'Prueba: 9 días'))),
      h('div', { className: 'av-menu', role: 'menu' },
        [['user', 'Mi perfil'], ['credit-card', 'Suscripción y facturas'], ['languages', 'Idioma y país'], ['shield-check', 'Privacidad y datos'], ['circle-help', 'Ayuda']].map(function (x) {
          return h('button', { key: x[1], className: 'av-menuitem', role: 'menuitem' }, h(Icon, { name: x[0], size: 18 }), x[1]);
        }),
        h('hr'), h('button', { className: 'av-menuitem av-danger', role: 'menuitem' }, h(Icon, { name: 'log-out', size: 18 }), 'Cerrar sesión')));
  }

  /* ---------- Feedback ---------- */
  function Modal(p) {
    var id = useId('dlg');
    return h('div', { className: 'av-scrim', style: p.inline ? { position: 'relative', inset: 'auto', padding: 24 } : null },
      h('div', { className: 'av-modal', role: p.alert ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-t', 'aria-describedby': id + '-d' },
        h('div', { className: 'av-modal__head' }, p.icon && h(Icon, { name: p.icon, size: 24, style: { color: p.tone === 'danger' ? 'var(--danger-text)' : 'var(--accent-text)', marginTop: 3 } }),
          h('h2', { id: id + '-t' }, p.title), h(IconButton, { icon: 'x', label: 'Cerrar', size: 'sm' })),
        h('div', { className: 'av-modal__body', id: id + '-d' }, p.children),
        h('div', { className: 'av-modal__foot' }, p.footer)));
  }
  function Drawer(p) {
    var id = useId('drw');
    return h('div', { style: { position: 'relative', height: p.height || 420, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' } },
      p.behind, h('div', { className: 'av-scrim', style: { placeItems: 'end' } }),
      h('aside', { className: 'av-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id },
        h('div', { className: 'av-modal__head' }, h('h2', { id: id, style: { fontSize: 22 } }, p.title), h(IconButton, { icon: 'x', label: 'Cerrar panel', size: 'sm' })),
        h('div', { className: 'av-modal__body', style: { flex: 1 } }, p.children),
        p.footer && h('div', { className: 'av-modal__foot' }, p.footer)));
  }
  function Toast(p) {
    var icon = { success: 'circle-check', danger: 'circle-alert', info: 'info' }[p.tone || 'success'];
    return h('div', { className: 'av-toast', role: p.tone === 'danger' ? 'alert' : 'status' }, h(Icon, { name: icon, size: 20 }),
      h('div', null, h('b', null, p.title), p.children), p.action && h('button', { className: 'av-toast__action' }, p.action));
  }
  function Alert(p) {
    var tone = p.tone || 'info';
    var icon = p.icon || { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert', accent: 'sparkles' }[tone];
    return h('div', { className: cx('av-alert', 'av-alert--' + tone, p.banner && 'av-banner'), role: tone === 'danger' ? 'alert' : 'status' },
      h(Icon, { name: icon, size: 20 }), h('div', { style: { flex: 1 } }, p.title && h('b', null, p.title), p.children),
      p.action, p.dismissible && h(IconButton, { icon: 'x', label: 'Descartar aviso', size: 'sm' }));
  }
  function Tooltip(p) { return h('span', { className: 'av-tooltip', role: 'tooltip', id: p.id }, p.children); }
  function Popover(p) { return h('div', { className: 'av-popover', role: 'dialog', 'aria-label': p.label }, p.children); }
  function AIJobProgress(p) {
    var steps = p.steps || ['Leyendo documentos', 'Extrayendo datos del deudor y la deuda', 'Redactando hechos y fundamentos', 'Revisando formato y cuantías'];
    var cur = p.current == null ? 2 : p.current;
    return h('div', { className: 'av-job', 'aria-live': 'polite' },
      h('div', { className: 'av-job__head' }, h('b', null, p.title || 'Generando tu reclamación'), h('span', { className: 'av-help' }, p.eta || 'Suele tardar 40–60 s')),
      h(Progress, { value: p.percent == null ? Math.round(cur / steps.length * 100) : p.percent, label: p.title || 'Generando documento' }),
      h('ol', { className: 'av-job__steps' }, steps.map(function (s, i) {
        var st = i < cur ? 'done' : i === cur ? 'current' : 'todo';
        return h('li', { key: i, 'data-state': st }, h(Icon, { name: st === 'done' ? 'circle-check' : st === 'current' ? 'loader-circle' : 'clock', size: 18, className: st === 'current' ? 'av-spin' : null }), s);
      })),
      h('div', { className: 'av-row', style: { justifyContent: 'space-between' } },
        h('span', { className: 'av-help' }, 'Puedes salir de esta pantalla: te avisaremos por email cuando esté listo.'),
        h(Button, { variant: 'ghost', size: 'sm' }, 'Cancelar')));
  }
  function EmptyState(p) {
    return h('div', { className: 'av-empty' }, h('div', { className: 'av-empty__icon' }, h(Icon, { name: p.icon || 'folder-open', size: 26 })),
      h('h3', null, p.title), h('p', null, p.children), p.action);
  }

  /* ---------- AI agent ---------- */
  function ToolCallBadge(p) {
    var st = p.state || 'done';
    return h('span', { className: 'av-toolcall', 'data-state': st },
      h(Icon, { name: st === 'running' ? 'loader-circle' : st === 'error' ? 'circle-alert' : 'check', size: 14, className: st === 'running' ? 'av-spin' : null }),
      p.label, h('span', { className: 'av-sr' }, st === 'running' ? ' (en curso)' : st === 'error' ? ' (error)' : ' (completado)'));
  }
  function ContextChips(p) {
    return h('div', { className: 'av-chips', 'aria-label': 'Contexto de la consulta' }, h('span', { className: 'av-help', style: { fontSize: 12 } }, 'Contexto:'),
      (p.chips || []).map(function (c) {
        return h('span', { key: c.label, className: 'av-chip' }, h(Icon, { name: c.icon || 'folder-open', size: 14 }), c.label,
          h('button', { type: 'button', 'aria-label': 'Quitar ' + c.label + ' del contexto' }, h(Icon, { name: 'x', size: 14 })));
      }));
  }
  function CitationBlock(p) {
    return h('section', { className: 'av-cites', 'aria-label': 'Fuentes citadas' },
      h('div', { className: 'av-cites__head' }, h('span', null, 'Fuentes (' + p.sources.length + ')'), h('span', null, 'Verifica en CENDOJ antes de citar')),
      p.sources.map(function (s, i) {
        return h('div', { key: i, className: 'av-cite', id: 'cite-' + (i + 1) },
          h('span', { className: 'av-cite__n' }, i + 1),
          h('div', null, h('div', { className: 'av-cite__title' }, s.title), h('div', { className: 'av-cite__ref' }, s.ref), s.quote && h('div', { className: 'av-cite__quote' }, '«' + s.quote + '»')),
          h('div', { className: 'av-col', style: { alignItems: 'flex-end', gap: 4 } },
            h('span', { className: cx('av-cite__verify', s.verified ? 'av-ok' : 'av-warn') }, h(Icon, { name: s.verified ? 'badge-check' : 'triangle-alert', size: 14 }), s.verified ? 'Localizada' : 'No localizada'),
            h(TextLink, { href: '#', external: true }, 'Abrir')));
      }));
  }
  function AIDisclaimer(p) {
    if (p.variant === 'inline') return h('p', { className: 'av-disclaimer av-disclaimer--inline' }, 'Avocat puede equivocarse. Revisa citas, plazos y cuantías antes de usar la respuesta.');
    return h('div', { className: 'av-disclaimer', role: 'note' }, h(Icon, { name: 'triangle-alert', size: 18 }),
      h('div', null, h('b', null, p.title || 'Revisa antes de presentar. '),
        p.children || 'Este borrador lo ha generado una IA y no constituye asesoramiento jurídico. Comprueba datos, plazos, cuantías y citas, o pide a un abogado colegiado que lo revise.'));
  }
  function AgentMessage(p) {
    if (p.role === 'user') return h('div', { className: 'av-msg av-msg--user' }, h('div', { className: 'av-msg__bubble' }, p.children));
    return h('article', { className: 'av-msg av-msg--assistant', 'aria-label': 'Respuesta de Avocat', 'aria-busy': p.streaming ? 'true' : undefined },
      h(Avatar, { agent: true, size: 28 }),
      h('div', { className: 'av-msg__bubble' },
        h('div', { className: 'av-msg__who' }, 'Avocat', h('span', null, p.meta || 'GPT-4o · con contexto del caso')),
        p.tools && h('div', { className: 'av-row', style: { gap: 6, marginBottom: 10 } }, p.tools.map(function (t) { return h(ToolCallBadge, { key: t.label, label: t.label, state: t.state }); })),
        p.children, p.streaming && h('span', { className: 'av-caret', 'aria-hidden': 'true' }),
        p.sources && h(CitationBlock, { sources: p.sources }),
        !p.streaming && p.actions !== false && h('div', { className: 'av-msg__actions' },
          h(Button, { variant: 'ghost', size: 'sm', icon: 'copy' }, 'Copiar'), h(Button, { variant: 'ghost', size: 'sm', icon: 'file-down' }, 'Exportar a Word'),
          h(Button, { variant: 'ghost', size: 'sm', icon: 'refresh-cw' }, 'Regenerar'),
          h(IconButton, { icon: 'thumbs-up', label: 'Respuesta útil', size: 'sm' }), h(IconButton, { icon: 'thumbs-down', label: 'Respuesta mejorable', size: 'sm' })),
        p.streaming && h(Button, { variant: 'secondary', size: 'sm', icon: 'circle-x', style: { marginTop: 12 } }, 'Detener')));
  }
  function AgentComposer(p) {
    return h('div', { className: 'av-composer' },
      h('div', { className: 'av-composer__box' },
        p.chips && h(ContextChips, { chips: p.chips }),
        h('label', { className: 'av-sr', htmlFor: 'composer' }, 'Escribe tu consulta'),
        h('textarea', { id: 'composer', rows: 2, placeholder: p.placeholder || 'Pregunta sobre el caso, pide un escrito o adjunta un documento…', defaultValue: p.value }),
        h('div', { className: 'av-composer__row' },
          h(IconButton, { icon: 'paperclip', label: 'Adjuntar documento', size: 'sm' }), h(IconButton, { icon: 'folder-open', label: 'Añadir caso al contexto', size: 'sm' }),
          h('span', { style: { flex: 1 } }), h('span', { className: 'av-help', style: { fontSize: 12 } }, 'Intro para enviar · Mayús+Intro, nueva línea'),
          h(IconButton, { icon: 'send', label: 'Enviar consulta', variant: 'accent', size: 'sm', disabled: p.disabled }))),
      h(AIDisclaimer, { variant: 'inline' }));
  }
  function AgentChat(p) {
    return h('div', { className: 'av-chat', style: p.style },
      h('div', { className: 'av-chat__log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversación' }, h('div', { className: 'av-chat__inner' }, p.children)),
      h(AgentComposer, { chips: p.chips }));
  }

  /* ---------- Legal documents & commerce ---------- */
  function DocumentPreview(p) {
    return h('div', { className: 'av-docview' },
      h('div', { className: 'av-docview__bar' }, h(Icon, { name: 'file-text', size: 18, style: { color: 'var(--accent-text)' } }), h('b', null, p.title || 'Demanda de juicio verbal — borrador'),
        h(StatusTag, { status: p.status || 'borrador', size: 'sm' })),
      p.disclaimer !== false && h(AIDisclaimer, null),
      h('div', { className: 'av-paper', lang: 'es' }, p.children || h(Frag, null,
        h('h1', null, 'Al Juzgado de Primera Instancia de Madrid'),
        h('p', null, 'Doña ', h('mark', null, 'María López García'), ', mayor de edad, con DNI ', h('mark', null, '00000000-T'), ', ante el Juzgado comparezco y, como mejor proceda en Derecho, DIGO:'),
        h('p', null, 'Que por medio del presente escrito formulo demanda de juicio verbal en reclamación de cantidad contra ', h('mark', null, 'Reformas Atocha, S. L.'), ', por importe de ', h('mark', null, '3.480,00 €'), ', con base en los siguientes'),
        h('h2', null, 'Hechos'),
        h('p', null, 'Primero. — Con fecha 14 de marzo de 2026 las partes suscribieron contrato de obra…'),
        h('p', { className: 'av-docnote' }, 'Los datos resaltados se han extraído de tus documentos: confírmalos antes de descargar.'))),
      p.actions !== false && h('div', { className: 'av-row', style: { justifyContent: 'flex-end' } },
        h(Button, { variant: 'secondary', icon: 'pen-line' }, 'Editar'), h(Button, { variant: 'secondary', icon: 'file-down' }, 'Word (.docx)'), h(Button, { variant: 'primary', icon: 'download' }, 'Descargar PDF')));
  }
  function DocumentCard(p) {
    return h('article', { className: 'av-doccard' },
      h('div', { className: 'av-doccard__icon' }, h(Icon, { name: p.icon || 'file-text', size: 22 })),
      h('div', { style: { minWidth: 0 } }, h('div', { className: 'av-doccard__title' }, p.title),
        h('div', { className: 'av-doccard__meta' }, h(StatusTag, { status: p.status || 'borrador', size: 'sm' }), h('span', null, p.meta))),
      h('div', { className: 'av-doccard__actions' }, h(Button, { variant: 'secondary', size: 'sm', icon: 'eye' }, 'Ver'),
        h(IconButton, { icon: 'download', label: 'Descargar ' + p.title, size: 'sm', variant: 'secondary' }), h(IconButton, { icon: 'ellipsis', label: 'Más acciones', size: 'sm' })));
  }
  var PLANS = [
    { id: 'abogados', name: 'Abogados', price: '75 €', per: '/mes', forWho: 'Despachos y abogados en ejercicio.', featured: true,
      items: ['Agente IA con contexto de cada caso', 'Casos, plazos y clientes', 'Escritos ilimitados', 'Panel de indicadores'], cta: 'Probar 14 días gratis', fine: 'Sin tarjeta. Cancela cuando quieras.' },
    { id: 'particulares', name: 'Particulares', price: '10 €', per: '/escrito', forWho: 'Reclama sin abogado cuando la ley lo permite.',
      items: ['Reclamación de cantidad (España)', 'Acción de tutela (Colombia)', 'Lenguaje claro, paso a paso', 'Descarga en Word y PDF'], cta: 'Crear mi escrito', fine: 'Pago único. Sin suscripción.' },
    { id: 'estudiantes', name: 'Estudiantes', price: '3 €', per: '/escrito', forWho: 'Grado y máster en Derecho.',
      items: ['Tutor socrático', 'Plantillas comentadas', '8 áreas del Derecho'], cta: 'Empezar a practicar', fine: 'Pago único por escrito.' }];
  function PlanCard(p) {
    var pl = p.plan;
    var body = h(Frag, null,
      pl.featured && p.selectable !== true && h('span', { className: 'av-plan__badge' }, h(Tag, { tone: 'inverse', size: 'sm' }, 'Más elegido')),
      h('div', null, h('div', { className: 'av-plan__name' }, pl.name), h('div', { className: 'av-plan__price' }, pl.price, h('small', null, pl.per)), h('p', { className: 'av-plan__for' }, pl.forWho)),
      p.compact !== true && h('ul', null, pl.items.map(function (it) { return h('li', { key: it }, h(Icon, { name: 'check', size: 16, strokeWidth: 2.25 }), it); })),
      p.selectable ? null : h(Button, { variant: pl.featured ? 'primary' : 'secondary', block: true }, pl.cta),
      p.selectable ? null : h('div', { className: 'av-plan__fine' }, pl.fine));
    if (p.selectable) return h('button', { type: 'button', role: 'radio', 'aria-checked': p.checked ? 'true' : 'false', className: cx('av-plan', 'av-plan--selectable'), style: { padding: 16, gap: 8 } }, body);
    return h('article', { className: cx('av-plan', pl.featured && 'av-plan--featured') }, body);
  }
  PlanCard.plans = PLANS;
  function CreditsMeter(p) {
    var used = p.used || 0, total = p.total || 100, left = total - used, pct = Math.round(left / total * 100);
    var level = left === 0 ? 'empty' : pct <= 15 ? 'low' : 'ok';
    return h('div', { className: 'av-credits', 'data-level': level },
      h('div', { className: 'av-credits__row' }, h('span', null, p.label || 'Escritos disponibles'), h('b', null, left, h('span', { style: { fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' } }, ' de ' + total))),
      h(Progress, { value: pct, label: 'Escritos disponibles' }),
      level !== 'ok' && h('div', { className: 'av-help', style: { color: level === 'empty' ? 'var(--danger-text)' : 'var(--warning-text)' } }, level === 'empty' ? 'Sin escritos disponibles.' : 'Te quedan pocos escritos.'),
      level !== 'ok' && h(Button, { size: 'sm', variant: 'accent' }, 'Comprar escritos'));
  }
  function CookieBanner() {
    return h('div', { className: 'av-cookie', role: 'dialog', 'aria-labelledby': 'ck-t' },
      h('b', { id: 'ck-t', style: { fontSize: 16, color: 'var(--text-heading)' } }, 'Tu privacidad'),
      h('p', { style: { margin: 0 } }, 'Usamos cookies técnicas para que Avocat funcione. Con tu permiso, también analíticas (Google Analytics, Microsoft Clarity) y de publicidad (Google Ads). ', h(TextLink, { href: '#' }, 'Política de cookies')),
      h('div', { className: 'av-row' }, h(Button, { variant: 'ghost', size: 'sm' }, 'Configurar'), h(Button, { variant: 'secondary', size: 'sm' }, 'Rechazar todas'), h(Button, { variant: 'secondary', size: 'sm' }, 'Aceptar todas')));
  }
  function Footer() {
    return h('footer', { className: 'av-footer', 'data-theme': 'light' },
      h('div', { style: { maxWidth: 1200, margin: '0 auto' } },
        h('div', { className: 'av-row', style: { justifyContent: 'space-between', alignItems: 'flex-start', gap: 32 } },
          h('div', { style: { maxWidth: 300 } }, h(Logo, { tone: 'cream', size: 26 }), h('p', { style: { marginTop: 12 } }, 'Plataforma jurídica con IA para abogados, particulares y estudiantes en España y Latinoamérica.')),
          [['Producto', ['Abogados', 'Particulares', 'Estudiantes', 'Precios']], ['Empresa', ['Nosotros', 'Contacto', 'Seguridad']], ['Legal', ['Aviso legal', 'Privacidad', 'Cookies', 'Términos', 'Configurar cookies']]].map(function (c) {
            return h('nav', { key: c[0], 'aria-label': c[0] }, h('b', { style: { display: 'block', marginBottom: 8 } }, c[0]), c[1].map(function (l) { return h('a', { key: l, href: '#', style: { display: 'block', textDecoration: 'none', padding: '3px 0' } }, l); }));
          })),
        h('div', { className: 'av-footer__legal' }, '© 2026 [Razón social, S. L.] · NIF [B-00000000] · [Domicilio social], Madrid · Inscrita en el Registro Mercantil de Madrid [tomo/folio/hoja] · soporte@avocatapp.com · Avocat no es un despacho de abogados y no presta asesoramiento jurídico.')));
  }

  function themePair(render, opts) {
    opts = opts || {};
    return h('div', { style: { display: 'grid', gridTemplateColumns: opts.stack ? '1fr' : 'repeat(auto-fit, minmax(' + (opts.min || 300) + 'px, 1fr))', gap: 0 } },
      ['light', 'dark'].map(function (t) {
        return h('div', { key: t, 'data-theme': t, className: 'av-theme', style: { padding: opts.pad == null ? 24 : opts.pad } },
          h('div', { className: 'av-spec-label' }, t === 'light' ? 'Light · público' : 'Dark · app'), render(t));
      }));
  }
  window.AvocatDS = {
    themePair: themePair,
    Icon: Icon, Logo: Logo, Button: Button, IconButton: IconButton, TextLink: TextLink,
    Field: Field, Input: Input, Textarea: Textarea, Select: Select, Combobox: Combobox, DatePicker: DatePicker, Checkbox: Checkbox, RadioGroup: RadioGroup, Switch: Switch, FileDropzone: FileDropzone,
    Card: Card, KPICard: KPICard, DataTable: DataTable, StatusTag: StatusTag, Tag: Tag, DeadlineItem: DeadlineItem, Avatar: Avatar,
    Navbar: Navbar, ProductsMenu: ProductsMenu, AppRail: AppRail, AppSidebar: AppSidebar, BottomNav: BottomNav, AppShell: AppShell, Tabs: Tabs, Breadcrumbs: Breadcrumbs, Pagination: Pagination, Stepper: Stepper, UserProfilePanel: UserProfilePanel,
    Modal: Modal, Drawer: Drawer, Toast: Toast, Alert: Alert, Tooltip: Tooltip, Popover: Popover, Skeleton: Skeleton, Progress: Progress, AIJobProgress: AIJobProgress, EmptyState: EmptyState,
    ToolCallBadge: ToolCallBadge, ContextChips: ContextChips, CitationBlock: CitationBlock, AIDisclaimer: AIDisclaimer, AgentMessage: AgentMessage, AgentComposer: AgentComposer, AgentChat: AgentChat,
    DocumentPreview: DocumentPreview, DocumentCard: DocumentCard, PlanCard: PlanCard, CreditsMeter: CreditsMeter, CookieBanner: CookieBanner, Footer: Footer,
    deadlineStatus: deadlineStatus, COUNTRIES: COUNTRIES
  };
})();
