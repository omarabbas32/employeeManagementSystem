# PowerShell script to modify invoice.html
$filePath = "d:\EMD\employeeManagementSystem\public\invoice.html"
$backupPath = "d:\EMD\employeeManagementSystem\public\invoice_original_backup.html"

# Create backup
Copy-Item $filePath $backupPath -Force

# Read content as UTF8
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace 1: Change tasks section from count+earnings to list
$tasksOld = @"
        <!-- Tasks Completed -->
        <div class="section-header"> المهام</div>
        <div class="data-row">
            <span class="data-label">المهام المكتملة:</span>
            <span class="data-value" id="tasks-completed">0</span>
        </div>
        <div class="data-row">
            <span class="data-label">أرباح المهام:</span>
            <span class="data-value" id="task-earnings">0 جنيه</span>
        </div>
"@

$tasksNew = @"
        <!-- Tasks Completed -->
        <div class="section-header"> المهام</div>
        <div id="tasks-list">
            <div class="data-row">
                <span class="data-label">لا توجد مهام</span>
            </div>
        </div>
"@

$content = $content -replace [regex]::Escape($tasksOld), $tasksNew

# Replace 2: Simplify totals section to show only net salary  
$totalsOld = @"
        <!-- Totals -->
        <div class="totals-section">
            <div class="total-row">
                <span>إجمالي الراتب:</span>
                <span id="gross-salary">0 جنيه</span>
            </div>
            <div class="total-row">
                <span>إجمالي الخصومات:</span>
                <span id="total-deductions">-0 جنيه</span>
            </div>
            <div class="total-row final">
                <span>صافي الراتب:</span>
                <span id="net-salary">0 جنيه</span>
            </div>
        </div>
"@

$totalsNew = @"
        <!-- Totals -->
        <div class="totals-section">
            <div class="total-row final">
                <span>صافي الراتب:</span>
                <span id="net-salary">0 جنيه</span>
            </div>
        </div>
"@

$content = $content -replace [regex]::Escape($totalsOld), $totalsNew

# Save changes
Set-Content $filePath $content -Encoding UTF8

Write-Host "✓ Modified tasks section"
Write-Host "✓ Modified totals section"
Write-Host "✓ Changes saved to invoice.html"
Write-Host "✓ Backup saved to invoice_original_backup.html"
