# One-off: registers run-blog-feed.ps1 as a weekly Windows scheduled task (Mondays 8:00 local).
# Remove it with: Unregister-ScheduledTask -TaskName 'Work-Wiki Blog Feed' -Confirm:$false

$Repo = 'E:\Users\Master\source\GitKraken\Work-Wiki'

$action    = New-ScheduledTaskAction -Execute 'powershell.exe' `
               -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Repo\automation\run-blog-feed.ps1`"" `
               -WorkingDirectory $Repo
$trigger   = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8:00am
# StartWhenAvailable: if the PC was off at 8:00, run at next startup instead of skipping the week.
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
               -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# Interactive: runs as you, only while you're logged in, so it can use your git and gh credentials.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName 'Work-Wiki Blog Feed' -Force -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal `
  -Description 'Weekly Optimizely World blog feed ingest into Work-Wiki; opens a PR.' | Out-Null

Get-ScheduledTask -TaskName 'Work-Wiki Blog Feed' | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
