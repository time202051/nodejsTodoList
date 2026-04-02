const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ljp14843",
});

// 数据库连接
connection.connect((err) => {
  if (err) return console.error("数据库连接失败:", err);
  console.log("数据库连接成功");
  createDatabase("todo_list_db");
});

connection.on("error", (err) => {
  console.log("数据库连接错误:", err);
});

//创建数据库
const createDatabase = (databaseName) => {
  connection.query(`CREATE DATABASE IF NOT EXISTS ${databaseName}`, (err) => {
    if (err) {
      console.error("创建数据库失败:", err);
      return;
    }
    console.log(`数据库 ${databaseName} 创建成功!`);

    //切换到创建的数据库
    connection.changeUser({ database: databaseName }, (err) => {
      if (err) return console.error("切换数据库失败:", err);
      console.log(`切换到数据库 ${databaseName} 成功!`);

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS todos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          text VARCHAR(255) NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      // 创建表
      connection.query(createTableSQL, (err) => {
        if (err) return console.error("创建表失败:", err);
        console.log("表创建成功!");

        //  检查是否有数据，如果没有则插入初始数据
        // connection.query(
        //   "SELECT COUNT(*) as count FROM todos",
        //   (err, results) => {
        //     if (err) return console.error("插入数据失败:", err);
        //     // console.log("数据插入成功!");
        //     if (results[0].count === 0) {
        //       const initialData = [
        //         { text: "学习Node.js", completed: false },
        //         { text: "完成todolist项目", completed: false },
        //         { text: "复习接口开发", completed: true },
        //       ];
        //       const insertSQL =
        //         "INSERT INTO todos (text,completed) VALUES (?, ?)";
        //       initialData.forEach((item) => {
        //         connection.query(
        //           insertSQL,
        //           [item.text, item.completed],
        //           (err) => {
        //             if (err) return console.error("插入数据失败:", err);
        //             console.log("数据插入成功!");
        //           },
        //         );
        //       });
        //     } else {
        //       console.log("数据库已存在数据，无需插入初始数据");
        //     }
        //   },
        // );
      });
    });
  });
};

// 创建Express应用实例
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // 托管静态文件目录

// 接口实现
// 读取todos数据
const readTodos = (callback) => {
  connection.query("SELECT * FROM todos ORDER BY id", (err, results) => {
    if (err) return console.error("读取数据失败:", err);
    callback(results);
  });
};
// 获取todo数据
app.get("/todos", (req, res) => {
  readTodos((todos) => {
    // console.log("获取到的todos数据:", todos);
    res.json({
      code: 200,
      message: "获取成功",
      data: todos,
    });
  });
});
// 创建数据
app.post("/todos", (req, res) => {
  console.log("创建数据:", req.body);
  const { text } = req.body;

  // 验证输入
  if (!text || text.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "请输入todo内容",
    });
  }

  // 插入数据
  const insertSQL = "INSERT INTO todos (text, completed) VALUES (?, ?)";
  connection.query(insertSQL, [text, false], (err, result) => {
    if (err)
      return res.status(500).json({
        success: false,
        message: "创建失败",
        error: err.message,
      });
    // 构建返回数据
    const newTodo = {
      id: result.insertId,
      text,
      completed: false,
      created_at: new Date().toISOString(),
    };
    res.status(201).json({
      success: true,
      message: "创建成功",
    });
  });
});
app.put("/todos/:id", (req, res) => {
  console.log("更新数据params:", req.params);
  console.log("更新数据body:", req.body);

  const { id } = req.params;
  const { text, completed } = req.body;

  let updateSQL = "UPDATE todos SET ";
  const values = [];

  if (text !== undefined) {
    updateSQL += "text = ?";
    values.push(text);
  }
  if (completed !== undefined) {
    if (values.length > 0) {
      updateSQL += ", ";
    }
    updateSQL += "completed = ?";
    values.push(completed ? 1 : 0);
  }
  if (!values.length)
    return res.status(400).json({
      success: false,
      message: "请提供要更新的内容",
    });
  updateSQL += " WHERE id = ?";
  values.push(parseInt(id));
  console.log("values", values);

  connection.query(updateSQL, values, (err, result) => {
    if (err)
      return res.status(500).json({
        success: false,
        message: "更新失败",
        error: err.message,
      });
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "todo不存在",
      });
    }
    res.status(200).json({
      success: true,
      message: "更新成功",
    });
  });
});
app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;
  const deleteSQL = "DELETE FROM todos WHERE id = ?";
  connection.query(deleteSQL, [parseInt(id)], (err, result) => {
    if (err)
      return res.status(500).json({
        success: false,
        message: "删除失败",
      });
    return res.status(200).json({
      success: true,
      message: "删除成功",
    });
  });
});

// 启动web服务器
app.listen(3001, () => {
  console.log("服务器启动成功，端口：3000");
});
