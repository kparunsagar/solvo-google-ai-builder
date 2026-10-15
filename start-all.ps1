$env:PATH = "$env:PATH;C:\Users\arunk\AppData\Local\Programs\nodejs;C:\Users\arunk\AppData\Local\Programs\git\cmd;C:\Users\arunk\AppData\Local\Programs\python"

Write-Host "Starting Sagara UrbanAI Full Microservices Suite..." -ForegroundColor Cyan

# 1. Start Backend API on port 5000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Users\Downloads\Urban Company\backend'; `$env:PATH = `"`$env:PATH;C:\Users\arunk\AppData\Local\Programs\nodejs`"; node dist/server.js"

# 2. Start Python Bike Tracking on port 8001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Users\Downloads\Urban Company\services\tracking-service'; & 'C:\Users\arunk\AppData\Local\Programs\python\python.exe' main.py"

# 3. Start Frontend UI on port 5173
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Users\Downloads\Urban Company\frontend'; `$env:PATH = `"`$env:PATH;C:\Users\arunk\AppData\Local\Programs\nodejs`"; npm run dev -- --host 0.0.0.0 --port 5173"

Start-Sleep -Seconds 3
Write-Host "Services started! Opening browser at http://localhost:5173..." -ForegroundColor Green
Start-Process "http://localhost:5173"
