const pool = require("../config/db");

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
  const sql = "UPDATE users SET password = ? WHERE id = ?";
  try {
    await pool.query(sql, [hashedPassword, id]);
    callback(null);
  } catch (err) {
    callback(err);
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
  getUserPasswordById,
  updatePassword,
};
