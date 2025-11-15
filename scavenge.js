function main() {
    var data = localStorage.getItem('scavengeData');
    if (!data) {
        alert('No data found. Run collector first.');
        return;
    }
    
    var results = JSON.parse(data);
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:10%;left:5%;right:5%;bottom:5%;background:white;border:2px solid #000;padding:10px;z-index:9999;overflow:auto;font-family:Arial';
    
    var header = document.createElement('h3');
    header.textContent = 'Scavenge Results - Copy Ratios for Auto Farmer';
    header.style.textAlign = 'center';
    
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
    
    var table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px';
    table.innerHTML = '<thead><tr style="background:#eee"><th>%</th><th>SP</th><th>L/h</th><th>LT</th><th>L Res</th><th>M/h</th><th>MT</th><th>M Res</th><th>S/h</th><th>ST</th><th>S Res</th><th>G/h</th><th>GT</th><th>G Res</th><th>Fixed Ratio</th></tr></thead>';
    
    var tbody = table.createTBody();
    var bestInTime = {s:0,eff:0,idx:0,rat:""};
    var maxEfficiency = {s:0,eff:0,idx:0,rat:""};
    var maxPercentages = [0,0,0,0];
    var maxPercentageInData = 0;
    
    function parseTime(timeStr) {
        if (timeStr === '-' || !timeStr) return 0;
        var parts = timeStr.split(':').map(Number);
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    function calculateOptimalRatio(timeLimitSec, percentLimit) {
        var availableModes = [[],[],[],[]];
        
        results.forEach(function(result) {
            var percentage = result.p || Math.round(result.s / results[results.length-1].s * 100);
            for (var mode = 0; mode < 4; mode++) {
                var duration = result.res[mode].d;
                if (duration !== '-') {
                    var durationSec = parseTime(duration);
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
        
        function findBestCombination(currentRatios, modeIndex, remainingPercent) {
            if (modeIndex >= 4) {
                if (remainingPercent === 0) {
                    var totalPerHour = 0;
                    for (var i = 0; i < 4; i++) {
                        if (currentRatios[i] > 0) {
                            var bestEff = 0;
                            for (var j = 0; j < availableModes[i].length; j++) {
                                if (availableModes[i][j].percentage === currentRatios[i]) {
                                    bestEff = availableModes[i][j].perHour;
                                    break;
                                }
                            }
                            totalPerHour += bestEff;
                        }
                    }
                    if (totalPerHour > bestTotalPerHour) {
                        bestTotalPerHour = totalPerHour;
                        bestCombination = currentRatios.slice();
                    }
                }
                return;
            }
            
            var maxAllowedPercent = percentLimit !== null ? Math.min(100, percentLimit) : 100;
            
            for (var percent = 0; percent <= Math.min(remainingPercent, maxAllowedPercent); percent++) {
                var hasValidOption = false;
                for (var i = 0; i < availableModes[modeIndex].length; i++) {
                    if (availableModes[modeIndex][i].percentage === percent) {
                        hasValidOption = true;
                        break;
                    }
                }
                
                if (hasValidOption || percent === 0) {
                    currentRatios[modeIndex] = percent;
                    findBestCombination(currentRatios, modeIndex + 1, remainingPercent - percent);
                    currentRatios[modeIndex] = 0;
                }
            }
        }
        
        findBestCombination([0,0,0,0], 0, 100);
        
        if (bestTotalPerHour === 0) {
            for (var mode = 3; mode >= 0; mode--) {
                if (availableModes[mode].length > 0) {
                    var bestOption = availableModes[mode][0];
                    for (var i = 1; i < availableModes[mode].length; i++) {
                        if (availableModes[mode][i].perHour > bestOption.perHour) {
                            bestOption = availableModes[mode][i];
                        }
                    }
                    bestCombination = [0,0,0,0];
                    bestCombination[mode] = Math.min(100, bestOption.percentage);
                    break;
                }
            }
        }
        
        return bestCombination[0] + '/' + bestCombination[1] + '/' + bestCombination[2] + '/' + bestCombination[3];
    }
    
    function calculateResults(percentLimit, timeLimitStr) {
        tbody.innerHTML = '';
        bestInTime = {s:0,eff:0,idx:0,rat:""};
        maxEfficiency = {s:0,eff:0,idx:0,rat:""};
        maxPercentages = [0,0,0,0];
        maxPercentageInData = 0;
        
        var timeLimitSec = parseTime(timeLimitStr);
        var optimalRatio = calculateOptimalRatio(timeLimitSec, percentLimit);
        
        results.forEach(function(result, index) {
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
        
        results.forEach(function(result, index) {
            var percentage = result.p || Math.round(result.s / results[results.length-1].s * 100);
            var row = tbody.insertRow();
            
            if (percentage === 100) {
                row.style.borderBottom = '2px solid #ff0000';
            } else if (percentage > 100) {
                row.style.background = '#fff9e6';
            }
            
            [percentage + '%', result.s].forEach(function(value) {
                var cell = row.insertCell();
                cell.textContent = value;
                cell.style.padding = '2px';
                cell.style.textAlign = 'center';
            });
            
            var totalEff = 0;
            var allWithinTime = true;
            var validModes = 0;
            
            for (var mode = 0; mode < 4; mode++) {
                var resCell = row.insertCell(), timeCell = row.insertCell(), totalResCell = row.insertCell();
                var duration = result.res[mode].d, perHour = 0, totalResources = 0;
                
                if (duration !== '-') {
                    var wood = result.res[mode].r.wood || 0;
                    var stone = result.res[mode].r.stone || 0;
                    var iron = result.res[mode].r.iron || 0;
                    totalResources = wood + stone + iron;
                    var durationSec = parseTime(duration);
                    perHour = durationSec > 0 ? Math.round(totalResources / durationSec * 3600 * 100) / 100 : 0;
                }
                
                resCell.textContent = perHour || 0;
                resCell.style.padding = '2px';
                resCell.style.textAlign = 'center';
                
                timeCell.textContent = duration;
                timeCell.style.padding = '2px';
                timeCell.style.textAlign = 'center';
                
                totalResCell.textContent = totalResources || 0;
                totalResCell.style.padding = '2px';
                totalResCell.style.textAlign = 'center';
                
                var durationSec = parseTime(duration);
                if (durationSec <= timeLimitSec && durationSec > 0 && perHour > 0) {
                    validModes++;
                    resCell.style.background = '#dfd';
                    timeCell.style.background = '#dfd';
                    totalResCell.style.background = '#dfd';
                } else if (perHour > 0) {
                    resCell.style.background = '#fdd';
                    timeCell.style.background = '#fdd';
                    totalResCell.style.background = '#fdd';
                    allWithinTime = false;
                }
                
                if (perHour > 0) totalEff += perHour;
            }
            
            var ratioCell = row.insertCell();
            ratioCell.textContent = optimalRatio;
            ratioCell.style.padding = '2px';
            ratioCell.style.textAlign = 'center';
            
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
            
            if (totalEff > bestInTime.eff && allWithinTime && validModes > 0) {
                bestInTime = {s: result.s, eff: totalEff, idx: index, rat: optimalRatio};
            }
            if (totalEff > maxEfficiency.eff && validModes > 0) {
                maxEfficiency = {s: result.s, eff: totalEff, idx: index, rat: optimalRatio};
            }
        });
        
        if (bestInTime.idx > 0) {
            tbody.rows[bestInTime.idx].style.background = '#e8f5e8';
        }
        if (maxEfficiency.idx > 0 && maxEfficiency.idx != bestInTime.idx) {
            tbody.rows[maxEfficiency.idx].style.background = '#fff3e0';
        }
        
        var summary = document.getElementById('summary') || document.createElement('div');
        summary.id = 'summary';
        summary.style.cssText = 'margin-top:10px;padding:5px;background:#f9f9f9';
        summary.innerHTML = '<div style="color:purple;font-weight:bold">Optimal Ratio: ' + optimalRatio + '</div>';
        
        if (bestInTime.idx > 0) {
            summary.innerHTML += '<div style="color:green"><strong>Best in Time:</strong> ' + bestInTime.s + ' SP | Ratio: <code style="background:#e3f2fd;padding:2px 5px;cursor:pointer" onclick="navigator.clipboard.writeText(\'' + bestInTime.rat + '\').then(function(){alert(\'Copied: ' + bestInTime.rat + '\')})">' + bestInTime.rat + '</code> | Eff: ' + Math.round(bestInTime.eff) + '</div>';
        }
        if (maxEfficiency.idx > 0) {
            summary.innerHTML += '<div style="color:blue"><strong>Max Efficiency:</strong> ' + maxEfficiency.s + ' SP | Ratio: <code style="background:#e3f2fd;padding:2px 5px;cursor:pointer" onclick="navigator.clipboard.writeText(\'' + maxEfficiency.rat + '\').then(function(){alert(\'Copied: ' + maxEfficiency.rat + '\')})">' + maxEfficiency.rat + '</code> | Eff: ' + Math.round(maxEfficiency.eff) + '</div>';
        }
        
        var info = document.getElementById('info') || document.createElement('div');
        info.id = 'info';
        info.style.cssText = 'margin-top:10px;padding:5px;background:#fff3cd;border:1px solid #ffeaa7';
        info.innerHTML = '<strong>Max percentages per mode (up to ' + maxPercentageInData + '%):</strong><br>Lazy: ' + maxPercentages[0] + '% | Modest: ' + maxPercentages[1] + '% | Skilled: ' + maxPercentages[2] + '% | Great: ' + maxPercentages[3] + '%';
        
        container.appendChild(header);
        container.appendChild(inputDiv);
        container.appendChild(table);
        container.appendChild(info);
        container.appendChild(summary);
        
        if (!document.querySelector('button.close')) {
            var closeBtn = document.createElement('button');
            closeBtn.className = 'close';
            closeBtn.textContent = 'Close';
            closeBtn.onclick = function() {
                document.body.removeChild(container);
            };
            container.appendChild(closeBtn);
        }
        
        document.body.appendChild(container);
    }
    
    updateBtn.onclick = function() {
        var percent = parseInt(percentInput.value);
        var timeLimit = timeInput.value;
        if (isNaN(percent) || percent < 1 || percent > 100) {
            alert('Please enter a valid percentage between 1 and 100');
        } else if (!/^\d{1,2}:\d{2}:\d{2}$/.test(timeLimit)) {
            alert('Please enter time in HH:MM:SS format');
        } else {
            calculateResults(percent, timeLimit);
        }
    };
    
    calculateResults(100, '02:00:00');
}

if (window.scavengeWindow) {
    document.body.removeChild(window.scavengeWindow);
}
main();
window.scavengeWindow = document.querySelector('div:last-child');
