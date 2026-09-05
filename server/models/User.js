const pool = require("../config/db");

const getPasswordHistory = async (id, callback) => {
  try {
    const [rows] = await pool.query(
      "SELECT password FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [id],
    );
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const findByEmail = async (email, callback) => {
  const sql = "SELECT * FROM users WHERE email = ?";

  try {
    const [rows] = await pool.query(sql, [email]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const getUsers = async (callback) => {
  const sql = `
    SELECT
      id,
      full_name,
      email,
      phone_number,
      department,
      role,
      status,
      created_at
    FROM users
    ORDER BY full_name ASC
  `;

  try {
    const [rows] = await pool.query(sql);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const createUser = async (data, callback) => {
  const sql = `
    INSERT INTO users
    (
      full_name,
      email,
      phone_number,
      password,
      role,
      department
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.query(sql, [
      data.full_name,
      data.email,
      data.phone_number,
      data.password,
      data.role,
      data.department,
    ]);
    callback(null, result.insertId);
  } catch (err) {
    callback(err);
  }
};

const getUserById = async (id, callback) => {
  const sql = `
    SELECT
      id,
      full_name,
      email,
      phone_number,
      department,
      role,
      status,
      created_at
    FROM users
    WHERE id = ?
  `;

  try {
    const [rows] = await pool.query(sql, [id]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const updateOwnProfile = async (id, data, callback) => {
  const sql = `
    UPDATE users
    SET
      full_name = ?,
      phone_number = ?
    WHERE id = ?
  `;

  try {
    await pool.query(sql, [data.full_name, data.phone_number, id]);
    callback(null);
  } catch (err) {
    callback(err);
  }
};

const updateUser = async (id, data, callback) => {
  const sql = `
    UPDATE users
    SET
      full_name = ?,
      email = ?,
      phone_number = ?,
      department = ?,
      role = ?,
      status = ?
    WHERE id = ?
  `;

  try {
    await pool.query(sql, [
      data.full_name,
      data.email,
      data.phone_number,
      data.department,
      data.role,
      data.status,
      id,
    ]);
    callback(null);
  } catch (err) {
    callback(err);
  }
};

const changeStatus = async (id, status, callback) => {
  const sql = `
    UPDATE users
    SET status = ?
    WHERE id = ?
  `;

  try {
    await pool.query(sql, [status, id]);
    callback(null);
  } catch (err) {
    callback(err);
  }
};

const countActiveAdmins = async (callback) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'Admin' AND status = 'Active'",
    );
    callback(null, Number(rows[0].count));
  } catch (err) {
    callback(err);
  }
};

const getUserPasswordById = async (id, callback) => {
  const sql = "SELECT password FROM users WHERE id = ?";
  try {
    const [rows] = await pool.query(sql, [id]);
    callback(null, rows);
  } catch (err) {
    callback(err);
  }
};

const updatePassword = async (id, hashedPassword, callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT password FROM users WHERE id = ? FOR UPDATE",
      [id],
    );
    if (rows.length === 0) throw new Error("USER_NOT_FOUND");
    await connection.query(
      "INSERT INTO password_history (user_id, password) VALUES (?, ?)",
      [id, rows[0].password],
    );
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);
    await connection.commit();
    callback(null);
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    callback(err);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  findByEmail,
  getUsers,
  createUser,
  getUserById,
  updateOwnProfile,
  updateUser,
  changeStatus,
  countActiveAdmins,
  getUserPasswordById,
  getPasswordHistory,
  updatePassword,
};
