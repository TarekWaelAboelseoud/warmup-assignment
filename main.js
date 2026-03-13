const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function convertToSeconds(time) {

        time = time.trim();

        let parts = time.split(" ");
        let clock = parts[0].split(":");

        let hours = Number(clock[0]);
        let minutes = Number(clock[1]);
        let seconds = Number(clock[2]);

        let period = parts[1];

        if (period === "pm" && hours !== 12) {
            hours += 12;
        }

        if (period === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let startSeconds = convertToSeconds(startTime);
    let endSeconds = convertToSeconds(endTime);

    // handle overnight shift
    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

    let duration = endSeconds - startSeconds;

    let hours = Math.floor(duration / 3600);
    let minutes = Math.floor((duration % 3600) / 60);
    let seconds = duration % 60;

    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function convertToSeconds(time) {

        time = time.trim();

        let parts = time.split(" ");
        let clock = parts[0].split(":");

        let hours = Number(clock[0]);
        let minutes = Number(clock[1]);
        let seconds = Number(clock[2]);

        let period = parts[1];

        if (period === "pm" && hours !== 12) hours += 12;
        if (period === "am" && hours === 12) hours = 0;

        return hours * 3600 + minutes * 60 + seconds;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    // handle overnight shift
    if (end < start) {
        end += 24 * 3600;
    }

    let deliveryStart = 8 * 3600;      // 8 AM
    let deliveryEnd = 22 * 3600;       // 10 PM

    let idle = 0;

    // idle before 8 AM
    if (start < deliveryStart) {
        idle += Math.max(0, Math.min(end, deliveryStart) - start);
    }

    // idle after 10 PM
    if (end > deliveryEnd) {
        idle += Math.max(0, end - Math.max(start, deliveryEnd));
    }

    let hours = Math.floor(idle / 3600);
    let minutes = Math.floor((idle % 3600) / 60);
    let seconds = idle % 60;

    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function toSeconds(time) {
        let parts = time.split(":");

        let hours = Number(parts[0]);
        let minutes = Number(parts[1]);
        let seconds = Number(parts[2]);

        return hours * 3600 + minutes * 60 + seconds;
    }

    let shiftSeconds = toSeconds(shiftDuration);
    let idleSeconds = toSeconds(idleTime);

    let active = shiftSeconds - idleSeconds;

    let hours = Math.floor(active / 3600);
    let minutes = Math.floor((active % 3600) / 60);
    let seconds = active % 60;

    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function toSeconds(time) {
        let parts = time.split(":");

        let hours = Number(parts[0]);
        let minutes = Number(parts[1]);
        let seconds = Number(parts[2]);

        return hours * 3600 + minutes * 60 + seconds;
    }

    let dateParts = date.split("-");
    let year = Number(dateParts[0]);
    let month = Number(dateParts[1]);
    let day = Number(dateParts[2]);

    let quota;

    // check if date is within Eid period
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quota = "6:00:00";
    } else {
        quota = "8:24:00";
    }

    let activeSeconds = toSeconds(activeTime);
    let quotaSeconds = toSeconds(quota);

    return activeSeconds >= quotaSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
const fs = require("fs");

function addShiftRecord(textFile, shiftObj) {
    let data = fs.readFileSync(textFile, "utf8");
    let rows = data.trim().split("\n");

    let driverID = shiftObj.driverID.trim();
    let date = shiftObj.date.trim();

    // check duplicates
    for (let row of rows) {

        let cols = row.split(",");

        let existingID = cols[0].trim();
        let existingDate = cols[2].trim();

        if (existingID === driverID && existingDate === date) {
            return {};
        }
    }

    // calculate fields
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let met = metQuota(date, activeTime);

    let hasBonus = false;

    let newObject = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: met,
        hasBonus: hasBonus
    };

    let newRow =
        shiftObj.driverID + "," +
        shiftObj.driverName + "," +
        shiftObj.date + "," +
        shiftObj.startTime + "," +
        shiftObj.endTime + "," +
        shiftDuration + "," +
        idleTime + "," +
        activeTime + "," +
        met + "," +
        hasBonus;

    // find last driver occurrence
    let insertIndex = -1;

    for (let i = 0; i < rows.length; i++) {

        let cols = rows[i].split(",");

        if (cols[0].trim() === driverID) {
            insertIndex = i;
        }
    }

    if (insertIndex === -1) {
        rows.push(newRow);
    } else {
        rows.splice(insertIndex + 1, 0, newRow);
    }

    fs.writeFileSync(textFile, rows.join("\n"));

    return newObject;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
const fs = require("fs");

function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile, "utf8");

    let rows = data.trim().split("\n");

    for (let i = 0; i < rows.length; i++) {

        let cols = rows[i].split(",");

        let existingID = cols[0].trim();
        let existingDate = cols[2].trim();

        if (existingID === driverID && existingDate === date) {

            cols[9] = newValue;

            rows[i] = cols.join(",");

            break;
        }
    }

    fs.writeFileSync(textFile, rows.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8");

    let rows = data.trim().split("\n");

    month = Number(month);

    let count = 0;
    let driverFound = false;

    for (let row of rows) {

        let cols = row.split(",");

        let id = cols[0].trim();
        let date = cols[2].trim();
        let bonus = cols[9].trim();

        if (id === driverID) {

            driverFound = true;

            let dateParts = date.split("-");
            let recordMonth = Number(dateParts[1]);

            if (recordMonth === month && bonus === "true") {
                count++;
            }
        }
    }

    if (!driverFound) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8");

    let rows = data.trim().split("\n");

    let totalSeconds = 0;

    for (let row of rows) {

        let cols = row.split(",");

        let id = cols[0].trim();
        let date = cols[2].trim();
        let activeTime = cols[7].trim();

        if (id === driverID) {

            let parts = date.split("-");
            let recordMonth = Number(parts[1]);

            if (recordMonth === month) {

                let timeParts = activeTime.split(":");

                let h = Number(timeParts[0]);
                let m = Number(timeParts[1]);
                let s = Number(timeParts[2]);

                totalSeconds += h * 3600 + m * 60 + s;
            }
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    const fs = require("fs");

    let shiftRows = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let rateRows = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let dayOff = "";

    for (let row of rateRows) {
        let cols = row.split(",");
        if (cols[0].trim() === driverID) {
            dayOff = cols[1].trim();
            break;
        }
    }

    let totalSeconds = 0;

    for (let row of shiftRows) {

        let cols = row.split(",");

        let id = cols[0].trim();
        let date = cols[2].trim();

        if (id !== driverID) continue;

        let parts = date.split("-");
        let recordMonth = Number(parts[1]);

        if (recordMonth !== month) continue;

        let dayName = new Date(date)
            .toLocaleDateString("en-US", { weekday: "long" });

        if (dayName === dayOff) continue;

        let year = Number(parts[0]);
        let day = Number(parts[2]);

        let quotaSeconds;

        if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
            quotaSeconds = 6 * 3600;
        } else {
            quotaSeconds = 8 * 3600 + 24 * 60;
        }

        totalSeconds += quotaSeconds;
    }

    totalSeconds -= bonusCount * 2 * 3600;

    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;

    m = String(m).padStart(2, "0");
    s = String(s).padStart(2, "0");

    return h + ":" + m + ":" + s;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    const fs = require("fs");

    let rows = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let row of rows) {
        let cols = row.split(",");

        if (cols[0].trim() === driverID) {
            basePay = Number(cols[2]);
            tier = Number(cols[3]);
            break;
        }
    }

    function toSeconds(time) {
        let p = time.split(":");
        return Number(p[0]) * 3600 + Number(p[1]) * 60 + Number(p[2]);
    }

    let actualSec = toSeconds(actualHours);
    let requiredSec = toSeconds(requiredHours);

    if (actualSec >= requiredSec) {
        return basePay;
    }

    let missingSec = requiredSec - actualSec;

    let allowance;

    if (tier === 1) allowance = 50;
    else if (tier === 2) allowance = 20;
    else if (tier === 3) allowance = 10;
    else allowance = 3;

    let allowanceSec = allowance * 3600;

    let remaining = missingSec - allowanceSec;

    if (remaining <= 0) {
        return basePay;
    }

    let billableHours = Math.floor(remaining / 3600);

    let deductionRatePerHour = Math.floor(basePay / 185);

    let salaryDeduction = billableHours * deductionRatePerHour;

    let netPay = basePay - salaryDeduction;

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
