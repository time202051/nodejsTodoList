// 引入必要的模块
const express = require("express"); // Express框架，用于构建Web应用
const cors = require("cors"); // CORS中间件，用于处理跨域请求
const mysql = require("mysql2"); // MySQL数据库模块，用于连接数据库和执行SQL查询

// 定义数据库配置
const DB_NAME = "todo_list_db";

// 先连接到MySQL服务器（不指定数据库）
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ljp14843",
});

// 连接数据库
connection.connect((err) => {
  if (err) {
    console.error("连接失败:", err);
    return;
  }
  console.log("连接MySQL服务器成功!");
  
  // 创建数据库
  connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`, (err) => {
    if (err) {
      console.error("创建数据库失败:", err);
      return;
    }
    console.log(`数据库 ${DB_NAME} 创建成功!`);
    
    // 切换到创建的数据库
    connection.changeUser({ database: DB_NAME }, (err) => {
      if (err) {
        console.error("切换数据库失败:", err);
        return;
      }
      console.log(`切换到数据库 ${DB_NAME} 成功!`);
      
      // 创建todos表
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS todos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          text VARCHAR(255) NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      connection.query(createTableSQL, (err) => {
        if (err) {
          console.error("创建表失败:", err);
          return;
        }
        console.log("表创建成功!");
        
        // 检查是否有数据，如果没有则插入初始数据
        connection.query("SELECT COUNT(*) as count FROM todos", (err, results) => {
          if (err) {
            console.error("查询数据失败:", err);
            return;
          }
          
          if (results[0].count === 0) {
            // 插入初始数据
            const initialData = [
              { text: "学习Node.js", completed: false },
              { text: "完成todolist项目", completed: false },
              { text: "复习接口开发", completed: true }
            ];
            
            const insertSQL = "INSERT INTO todos (text, completed) VALUES (?, ?)";
            initialData.forEach(item => {
              connection.query(insertSQL, [item.text, item.completed], (err) => {
                if (err) {
                  console.error("插入数据失败:", err);
                }
              });
            });
            console.log("初始数据插入成功!");
          }
        });
      });
    });
  });
});

// 创建Express应用实例
const app = express();
// 设置服务器端口
const port = 3000;

// 中间件配置
app.use(express.json()); // 解析JSON格式的请求体
app.use(cors()); // 允许跨域请求
app.use(express.static("public")); // 托管静态文件目录

// 读取todos数据函数
function readTodos(callback) {
  connection.query("SELECT * FROM todos ORDER BY id", (err, results) => {
    if (err) {
      console.error("读取数据失败:", err);
      callback([]);
      return;
    }
    callback(results);
  });
}

// 写入todos数据函数 - 这里不需要，因为我们直接操作数据库

// GET请求 - 获取所有todos
app.get("/todos", (req, res) => {
  readTodos((todos) => {
    res.json({
      code: 200,
      message: "获取成功",
      data: todos,
    });
  });
});

// POST请求 - 创建新的todo
app.post("/todos", (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({
      code: 400,
      message: "请输入todo内容",
    });
  }
  
  const insertSQL = "INSERT INTO todos (text, completed) VALUES (?, ?)";
  connection.query(insertSQL, [text, false], (err, result) => {
    if (err) {
      console.error("创建todo失败:", err);
      return res.status(500).json({
        code: 500,
        message: "创建失败",
      });
    }
    
    const newTodo = {
      id: result.insertId,
      text: text,
      completed: false,
    };
    
    res.json({
      code: 200,
      message: "创建成功",
      data: newTodo,
    });
  });
});

// PUT请求 - 更新指定的todo
app.put("/todos/:id", (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  
  // 构建更新语句
  let updateSQL = "UPDATE todos SET";
  const values = [];
  
  if (text !== undefined) {
    updateSQL += " text = ?";
    values.push(text);
  }
  
  if (completed !== undefined) {
    if (values.length > 0) updateSQL += ",";
    updateSQL += " completed = ?";
    values.push(completed);
  }
  
  updateSQL += " WHERE id = ?";
  values.push(parseInt(id));
  
  connection.query(updateSQL, values, (err, result) => {
    if (err) {
      console.error("更新todo失败:", err);
      return res.status(500).json({
        code: 500,
        message: "更新失败",
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: "todo不存在",
      });
    }
    
    // 查询更新后的数据
    connection.query("SELECT * FROM todos WHERE id = ?", [parseInt(id)], (err, results) => {
      if (err) {
        console.error("查询更新后数据失败:", err);
        return res.status(500).json({
          code: 500,
          message: "查询失败",
        });
      }
      
      res.json({
        code: 200,
        message: "更新成功",
        data: results[0],
      });
    });
  });
});

// DELETE请求 - 删除指定的todo
app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;
  
  const deleteSQL = "DELETE FROM todos WHERE id = ?";
  connection.query(deleteSQL, [parseInt(id)], (err, result) => {
    if (err) {
      console.error("删除todo失败:", err);
      return res.status(500).json({
        code: 500,
        message: "删除失败",
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: "todo不存在",
      });
    }
    
    res.json({
      code: 200,
      message: "删除成功",
      data: null,
    });
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
