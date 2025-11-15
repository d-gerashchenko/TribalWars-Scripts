// Tribal Wars Scavenge Efficiency Calculator
// Calculates optimal scavenge ratios based on resources per hour

function main() {
    // Get scavenge data from localStorage
    var data = localStorage.getItem('scavengeData');
    if (!data) {
        alert('No scavenge data found. Please run the data collector first.');
        return;
    }
    
    var results = JSON.parse(data);
    
    // Remove existing window if it exists
    if (window.scavengeWindow) {
        try {
            document.body.removeChild(window.scavengeWindow);
        } catch(e) {
            // Window already removed or doesn't exist
        }
    }
    
    // Create main container
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:10%;left:5%;right:5%;bottom:5%;background:white;border:2px solid #000;padding:10px;z-index:9999;overflow:auto;font-family:Arial';
    window.scavengeWindow = container;
    
    // Create header
    var header = document.createElement('h3');
    header.textContent = 'Scavenge Results - Copy Ratios for Auto Farmer';
    header.style.textAlign = 'center';
    container.appendChild(header);
    
    // Create input controls
    var inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'margin:10px 0;padding:10px;background:#f5f5f5;border:1px solid #ddd';
    
    var percentLabel = document.createElement('label');
    percentLabel.textContent = 'Troops % limit: ';
    percentLabel.style.fontWeight = 'bold';
    percentLabel.style.marginRight = '10px';
    
    var percentInput = document.createElement('input');
    percentInput.type = 'number';
    percentInput.min = '1';
    percentInput.max = '100';
    percentInput.value = '100';
    percentInput.style.cssText = 'padding:5px;width:60px;border:1px solid #ccc;border-radius:3px';
    
    var timeLabel = document.createElement('label');
    timeLabel.textContent = 'Time limit (HH:MM:SS): ';
    timeLabel.style.fontWeight = 'bold';
    timeLabel.style.marginLeft = '20px';
    timeLabel.style.marginRight = '10px';
    
    var timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.value = '02:00:00';
    timeInput.placeholder = 'HH:MM:SS';
    timeInput.style.cssText = 'padding:5px;width:80px;border:1px solid #ccc;border-radius:3px';
    
    var updateBtn = document.createElement('button');
    updateBtn.textContent = 'Update';
    updateBtn.style.cssText = 'margin-left:10px;padding:5px 10px;background:#4CAF50;color:white;border:none;border-radius:3px;cursor:pointer';
    
    inputDiv.appendChild(percentLabel);
    inputDiv.appendChild(percentInput);
    inputDiv.appendChild(timeLabel);
    inputDiv.appendChild(timeInput);
    inputDiv.appendChild(updateBtn);
    container.appendChild(inputDiv);
    
    // Create results table
    var table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px';
    table.innerHTML = '<thead><tr style="background:#eee"><th>%</th><th>SP</th><th>L/h</th><th>LT</th><th>L Res</th><th>M/h</th><th>MT</th><th>M Res</th><th>S/h</th><th>ST</th><th>S Res</th><th>G/h</th><th>GT</th><th>G Res</th><th>Fixed Ratio</th></tr></thead>';
    
    var tbody = table.createTBody();
    container.appendChild(table);
    
    // Utility function to parse time string to seconds
    function parseTime(timeStr) {
        if (timeStr === '-' || !timeStr) return 0;
        var parts = timeStr.split(':').map(Number);
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    // Calculate optimal ratio considering time limit and troops percentage limit
    function calculateOptimalRatio(timeLimitSec, percentLimit) {
        // Organize available modes with their data
        var availableModes = [[],[],[],[]];
        
        results.forEach(function(result) {
            var percentage = result.p || Math.round(result.s / results[results.length-1].s * 100);
            
            for (var mode = 0; mode < 4; mode++) {
                var duration = result.res[mode].d;
                if (duration !== '-') {
                    var durationSec = parseTime(duration);
                    // Only include modes within time limit
                    if (durationSec <= timeLimitSec && durationSec > 0) {
                        var wood = result.res[mode].r.wood || 0;
                        var stone = result.res[mode].r.stone || 0;
                        var iron = result.res[mode].r.iron || 0;
                        var totalRes = wood + stone + iron;
                        var perHour = durationSec > 0 ? Math.round(totalRes / durationSec * 3600 * 100) / 100 : 0;
                        
                        availableModes[mode].push({
                            percentage: percentage,
                            perHour: perHour,
                            totalRes: totalRes,
                            duration: duration,
                            durationSec: durationSec,
                            mode: mode
                        });
                    }
                }
            }
        });
        
        var bestCombination = [0,0,0,0];
        var bestTotalPerHour = 0;
        
        // Recursive function to find best combination
        function findBestCombination(currentRatios, modeIndex, remainingPercent) {
            // Base case: all modes processed
            if (modeIndex >= 4) {
                if (remainingPercent === 0) {
                    // Calculate total resources per hour for this combination
                    var totalPerHour = 0;
                    for (var i = 0; i < 4; i++) {
                        if (currentRatios[i] > 0) {
                            var bestEff = 0;
                            // Find the exact match for this percentage
                            for (var j = 0; j < availableModes[i].length; j++) {
                                if (availableModes[i][j].percentage === currentRatios[i]) {
                                    bestEff = availableModes[i][j].perHour;
                                    break;
                                }
                            }
                            totalPerHour += bestEff;
                        }
                    }
                    // Update best combination if this one is better
                    if (totalPerHour > bestTotalPerHour) {
                        bestTotalPerHour = totalPerHour;
                        bestCombination = currentRatios.slice();
                    }
                }
                return;
            }
            
            // Calculate maximum allowed percentage for this mode
            var maxAllowedPercent = Math.min(percentLimit, remainingPercent);
            
            // Try all possible percentages for current mode
            for (var percent = 0; percent <= maxAllowedPercent; percent++) {
                var hasValidOption = false;
                // Check if this percentage exists in available data
                for (var i = 0; i < availableModes[modeIndex].length; i++) {
                    if (availableModes[modeIndex][i].percentage === percent) {
                        hasValidOption = true;
                        break;
                    }
                }
                
                // Only proceed if percentage is valid or zero
                if (hasValidOption || percent === 0) {
                    currentRatios[modeIndex] = percent;
                    // Recursively process next mode with remaining percentage
                    findBestCombination(currentRatios, modeIndex + 1, remainingPercent - percent);
                    currentRatios[modeIndex] = 0; // backtrack
                }
            }
        }
        
        // Start the search with empty ratios and 100% to distribute
        findBestCombination([0,0,0,0], 0, 100);
        
        // Fallback: if no combination found, use single best mode
        if (bestTotalPerHour === 0) {
            for (var mode = 3; mode >= 0; mode--) {
                if (availableModes[mode].length > 0) {
                    var bestOption = availableModes[mode][0];
                    // Find the most efficient option in this mode
                    for (var i = 1; i < availableModes[mode].length; i++) {
                        if (availableModes[mode][i].perHour > bestOption.perHour) {
                            bestOption = availableModes[mode][i];
                        }
                    }
                    bestCombination = [0,0,0,0];
                    bestCombination[mode] = Math.min(percentLimit, bestOption.percentage);
                    break;
                }
            }
        }
        
        return bestCombination[0] + '/' + bestCombination[1] + '/' + bestCombination[2] + '/' + bestCombination[3];
    }
    
    // Main function to calculate and display results
    function calculateResults(percentLimit, timeLimitStr) {
        // Clear previous results
        tbody.innerHTML = '';
        
        var timeLimitSec = parseTime(timeLimitStr);
        var optimalRatio = calculateOptimalRatio(timeLimitSec, percentLimit);
        
        // Display results for each percentage point
        results.forEach(function(result, index) {
            var percentage = result.p || Math.round(result.s / results[results.length-1].s * 100);
            var row = tbody.insertRow();
            
            // Highlight special rows
            if (percentage === 100) {
                row.style.borderBottom = '2px solid #ff0000';
            } else if (percentage > 100) {
                row.style.background = '#fff9e6';
            }
            
            // Add percentage and SP columns
            [percentage + '%', result.s].forEach(function(value) {
                var cell = row.insertCell();
                cell.textContent = value;
                cell.style.padding = '2px';
                cell.style.textAlign = 'center';
            });
            
            // Add data for each scavenge mode (Lazy, Modest, Skilled, Great)
            for (var mode = 0; mode < 4; mode++) {
                var resCell = row.insertCell();
                var timeCell = row.insertCell();
                var totalResCell = row.insertCell();
                
                var duration = result.res[mode].d;
                var perHour = 0;
                var totalResources = 0;
                
                if (duration !== '-') {
                    var wood = result.res[mode].r.wood || 0;
                    var stone = result.res[mode].r.stone || 0;
                    var iron = result.res[mode].r.iron || 0;
                    totalResources = wood + stone + iron;
                    var durationSec = parseTime(duration);
                    perHour = durationSec > 0 ? Math.round(totalResources / durationSec * 3600 * 100) / 100 : 0;
                }
                
                // Resources per hour cell
                resCell.textContent = perHour || 0;
                resCell.style.padding = '2px';
                resCell.style.textAlign = 'center';
                
                // Time cell
                timeCell.textContent = duration;
                timeCell.style.padding = '2px';
                timeCell.style.textAlign = 'center';
                
                // Total resources cell
                totalResCell.textContent = totalResources || 0;
                totalResCell.style.padding = '2px';
                totalResCell.style.textAlign = 'center';
                
                // Color code cells based on time limit
                var durationSec = parseTime(duration);
                if (durationSec <= timeLimitSec && durationSec > 0 && perHour > 0) {
                    resCell.style.background = '#dfd';
                    timeCell.style.background = '#dfd';
                    totalResCell.style.background = '#dfd';
                } else if (perHour > 0) {
                    resCell.style.background = '#fdd';
                    timeCell.style.background = '#fdd';
                    totalResCell.style.background = '#fdd';
                }
            }
            
            // Add ratio column
            var ratioCell = row.insertCell();
            ratioCell.textContent = optimalRatio;
            ratioCell.style.padding = '2px';
            ratioCell.style.textAlign = 'center';
            
            // Make first row's ratio clickable for copying
            if (index === 0) {
                ratioCell.style.background = '#e3f2fd';
                ratioCell.style.fontWeight = 'bold';
                ratioCell.style.cursor = 'pointer';
                ratioCell.title = 'Click to copy ratio';
                ratioCell.onclick = function() {
                    navigator.clipboard.writeText(optimalRatio).then(function() {
                        alert('Copied: ' + optimalRatio);
                    }).catch(function() {
                        prompt('Copy this ratio:', optimalRatio);
                    });
                };
            }
        });
        
        // Create or update summary section
        var existingSummary = container.querySelector('#summary');
        if (existingSummary) {
            container.removeChild(existingSummary);
        }
        
        var summary = document.createElement('div');
        summary.id = 'summary';
        summary.style.cssText = 'margin-top:10px;padding:5px;background:#f9f9f9';
        summary.innerHTML = '<div style="color:purple;font-weight:bold">Optimal Ratio: ' + optimalRatio + ' (Troops Limit: ' + percentLimit + '%)</div>';
        container.appendChild(summary);
        
        // Create or update info section
        var existingInfo = container.querySelector('#info');
        if (existingInfo) {
            container.removeChild(existingInfo);
        }
        
        // Calculate max percentages for info display
        var maxPercentages = [0,0,0,0];
        var maxPercentageInData = 0;
        
        results.forEach(function(result) {
            var percentage = result.p || Math.round(result.s / results[results.length-1].s * 100);
            if (percentage > maxPercentageInData) maxPercentageInData = percentage;
            
            for (var mode = 0; mode < 4; mode++) {
                var duration = result.res[mode].d;
                if (duration !== '-') {
                    var durationSec = parseTime(duration);
                    if (durationSec <= timeLimitSec && durationSec > 0 && percentage > maxPercentages[mode]) {
                        maxPercentages[mode] = percentage;
                    }
                }
            }
        });
        
        var info = document.createElement('div');
        info.id = 'info';
        info.style.cssText = 'margin-top:10px;padding:5px;background:#fff3cd;border:1px solid #ffeaa7';
        info.innerHTML = '<strong>Max percentages per mode (up to ' + maxPercentageInData + '%):</strong><br>Lazy: ' + maxPercentages[0] + '% | Modest: ' + maxPercentages[1] + '% | Skilled: ' + maxPercentages[2] + '% | Great: ' + maxPercentages[3] + '%';
        container.appendChild(info);
    }
    
    // Update button event handler
    updateBtn.onclick = function() {
        var percent = parseInt(percentInput.value);
        var timeLimit = timeInput.value;
        
        // Input validation
        if (isNaN(percent) || percent < 1 || percent > 100) {
            alert('Please enter a valid percentage between 1 and 100');
        } else if (!/^\d{1,2}:\d{2}:\d{2}$/.test(timeLimit)) {
            alert('Please enter time in HH:MM:SS format');
        } else {
            calculateResults(percent, timeLimit);
        }
    };
    
    // Add close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:10px;padding:5px 15px;background:#f44336;color:white;border:none;border-radius:3px;cursor:pointer';
    closeBtn.onclick = function() {
        document.body.removeChild(container);
        window.scavengeWindow = null;
    };
    container.appendChild(closeBtn);
    
    // Add container to page and calculate initial results
    document.body.appendChild(container);
    calculateResults(100, '02:00:00');
}

// Auto-execute main function
main();
