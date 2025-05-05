REM === Create main project directories ===
mkdir src
mkdir src\components
mkdir src\components\layout
mkdir src\components\tools
mkdir src\components\tools\helm-secrets
mkdir src\components\tools\base64
mkdir src\components\tools\api-tester
mkdir src\components\tools\kafka-tester
mkdir src\components\tools\regex
mkdir src\components\tools\time-units
mkdir src\components\tools\bson
mkdir src\components\tools\keytab
mkdir src\components\tools\rsa
mkdir src\common
mkdir src\common\editor
mkdir src\hooks
mkdir electron

REM === Create main project files ===
type nul > package.json
type nul > tsconfig.json
type nul > vite.config.ts
type nul > README.md

REM === Create Electron files ===
type nul > electron\main.ts
type nul > electron\preload.ts

REM === Create main React app files ===
type nul > src\App.tsx
type nul > src\main.tsx
type nul > src\index.html

REM === Create component files ===
type nul > src\components\layout\Layout.tsx
type nul > src\components\tools\helm-secrets\index.tsx
type nul > src\components\tools\base64\index.tsx
type nul > src\components\tools\api-tester\ApiTester.tsx
type nul > src\components\tools\kafka-tester\index.tsx
type nul > src\components\tools\regex\index.tsx
type nul > src\components\tools\time-units\index.tsx
type nul > src\components\tools\bson\index.tsx
type nul > src\components\tools\keytab\index.tsx
type nul > src\components\tools\rsa\index.tsx

REM === Create common/editor and hooks files ===
type nul > src\common\editor\MonacoEditor.tsx
type nul > src\hooks\useTheme.ts

echo Project structure created!