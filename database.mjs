import pg from "pg";
const { Pool, Client } = pg;

const pool = new Pool({ connectionString: process.env.POSTGRES });

export const query = async (...args) => {
    console.info(...args);
    return pool.query(...args);
};

export async function INSERT(data) {
    const identifier = Object.keys(data).join(",");
    const placeholder = Array.from(Object.entries(data), (_, i) => `$${++i}`).join(",");
    const values = Object.values(data);
    const sql = `INSERT INTO users (${identifier}) VALUES (${placeholder})`;
    console.info("INSERT", sql, values);
    return pool.query(sql, values);
}

export async function SELECT(expression, where) {
    const placeholder = Object.keys(where).map((k, i) => `${k} = $${++i}`).join(" AND ");
    const values = Object.values(where);
    const sql = `SELECT ${expression} FROM users WHERE ${placeholder}`;
    console.info("SELECT", sql, values);
    return pool.query(sql, values).then(res => res.rows);
}

export async function UPDATE(args) {
    const set = Object.keys(args.set)
                  .map((k, i) => `${k} = $${i + 1}`)
                  .join(", ");
    const set_values = Object.values(args.set);

    const where = Object.keys(args.where)
                        .map((k, i) => `${k} = $${i + 1 + Object.keys(args.set).length}`)
                        .join(", ");
    const where_values = Object.values(args.where);

    const sql = `UPDATE users SET ${set} WHERE ${where}`;
    console.info("UPDATE", sql, set_values.concat(where_values));
    return pool.query(sql, set_values.concat(where_values));
}

export async function DELETE(args) {
    const where = Object.keys(args.where)
                        .map((k, i) => `${k} = $${i + 1}`)
                        .join(", ");
    const where_values = Object.values(args.where);

    const sql = `DELETE FROM users WHERE ${where}`;
    console.info("DELETE", sql, where_values);

    return pool.query(sql, where_values);
}