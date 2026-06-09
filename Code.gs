// ============================================================
// BuildERP - Google Apps Script Backend
// วางโค้ดนี้ใน Google Apps Script แล้ว Deploy เป็น Web App
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ===== CORS Helper =====
function setCorsHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader("Access-Control-Allow-Origin", "*")
    .addHeader("Access-Control-Allow-Methods", "GET, POST")
    .addHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ===== Router =====
function doGet(e) {
  const action = e.parameter.action;
  const sheet  = e.parameter.sheet;
  let result;

  try {
    if (action === "read")        result = readSheet(sheet);
    else if (action === "stats")  result = getDashboardStats();
    else                          result = { error: "Unknown action" };
  } catch (err) {
    result = { error: err.message };
  }

  return setCorsHeaders(
    ContentService.createTextOutput(JSON.stringify(result))
  );
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const { action, sheet, data, id } = body;
  let result;

  try {
    if      (action === "create") result = createRow(sheet, data);
    else if (action === "update") result = updateRow(sheet, id, data);
    else if (action === "delete") result = deleteRow(sheet, id);
    else                          result = { error: "Unknown action" };
  } catch (err) {
    result = { error: err.message };
  }

  return setCorsHeaders(
    ContentService.createTextOutput(JSON.stringify(result))
  );
}

// ============================================================
// CRUD Functions
// ============================================================

function readSheet(sheetName) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Sheet "${sheetName}" not found` };

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data    = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  return { success: true, data };
}

function createRow(sheetName, data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Sheet "${sheetName}" not found` };

  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newId    = generateId(sheetName);
  data.id        = newId;
  data.createdAt = new Date().toISOString();
  const row      = headers.map(h => data[h] || "");

  sheet.appendRow(row);
  return { success: true, id: newId };
}

function updateRow(sheetName, id, data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Sheet "${sheetName}" not found` };

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      headers.forEach((h, col) => {
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(data[h]);
        }
      });
      return { success: true };
    }
  }
  return { error: "Row not found" };
}

function deleteRow(sheetName, id) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: `Sheet "${sheetName}" not found` };

  const rows  = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: "Row not found" };
}

// ============================================================
// Dashboard Stats (รวมข้อมูลจากหลาย Sheet)
// ============================================================

function getDashboardStats() {
  const projects = readSheet("projects").data || [];
  const tasks    = readSheet("tasks").data    || [];
  const expenses = readSheet("expenses").data || [];

  const totalBudget  = projects.reduce((s, p) => s + Number(p.budget  || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount  || 0), 0);
  const doneTasks    = tasks.filter(t => t.status === "เสร็จแล้ว").length;
  const activeProj   = projects.filter(p => p.status === "กำลังดำเนินการ").length;

  return {
    success: true,
    stats: {
      totalProjects:   projects.length,
      activeProjects:  activeProj,
      totalTasks:      tasks.length,
      doneTasks,
      totalBudget,
      totalExpense,
      remaining:       totalBudget - totalExpense,
    }
  };
}

// ============================================================
// Utility
// ============================================================

function generateId(sheetName) {
  const prefix = { projects: "P", tasks: "T", employees: "E", expenses: "EX", materials: "M" };
  const p      = prefix[sheetName] || "X";
  return p + Date.now().toString().slice(-6);
}

// ============================================================
// SETUP — รันครั้งแรกเพื่อสร้าง Sheet และ Headers
// ============================================================

function setupSheets() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const config = [
    {
      name: "projects",
      headers: ["id","name","client","budget","spent","status","progress","startDate","endDate","manager","description","createdAt"]
    },
    {
      name: "tasks",
      headers: ["id","projectId","title","assignee","status","priority","due","category","description","createdAt"]
    },
    {
      name: "employees",
      headers: ["id","name","role","phone","email","department","status","startDate","salary","createdAt"]
    },
    {
      name: "expenses",
      headers: ["id","projectId","description","amount","date","category","by","receipt","createdAt"]
    },
    {
      name: "materials",
      headers: ["id","name","unit","quantity","minStock","price","supplier","location","createdAt"]
    },
  ];

  config.forEach(({ name, headers }) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log(`✅ Created sheet: ${name}`);
    }
    // ใส่ headers เฉพาะแถวแรกถ้ายังว่าง
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      // Style header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1a1a2e");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log(`✅ Headers set for: ${name}`);
    }
  });

  Logger.log("🎉 Setup complete! All sheets ready.");
  SpreadsheetApp.getUi().alert("✅ Setup เสร็จแล้ว!\nสร้าง Sheets: projects, tasks, employees, expenses, materials");
}
