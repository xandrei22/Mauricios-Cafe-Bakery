async function findUserByGoogleId(db, googleId) {
    const [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return rows[0];
}

async function findUserById(db, id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}

async function createUser(db, { google_id, email, name }) {
    const [result] = await db.query(
        'INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)', [google_id, email, name]
    );
    return result.insertId;
}

module.exports = {
    findUserByGoogleId,
    findUserById,
    createUser
};