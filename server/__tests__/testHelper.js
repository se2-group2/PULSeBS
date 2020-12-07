"use strict";
jest.setMock("../db", require("../__mocks__/db.mock"));
const db = require("../db");

async function initDB() {
    //Insert student
    // let sql = "INSERT INTO User(UserID, FullName, UserName, Password, AccessLevel) VALUES('275330', 'John Doe', 'john@polito.it', '$2b$12$7iALJ38k/PBlAB7b8JDksu7v85z.tjnC9XfoMdUJd75bIId87Ip2S', 1)";
    // await db.pRun(sql);
    // // Insert teacher
    // sql = "INSERT INTO User(UserID, FullName, UserName, Password, AccessLevel) VALUES('141216', 'Marco', 'marco@polito.it', '$2b$12$7iALJ38k/PBlAB7b8JDksu7v85z.tjnC9XfoMdUJd75bIId87Ip2S', 2)";
    // await db.pRun(sql);
    // // Insert course
    // sql = "INSERT INTO Course(CourseName, TeacherID) VALUES('Mobile Application development', '141216')";
    // db.pRun(sql);
    // // Insert course schedule
    // sql = "INSERT INTO CourseSchedule(CourseID, CourseStatus, CourseType, TimeStart, TimeEnd, OccupiedSeat, MaxSeat, Classroom) VALUES(1, 1, 1, '2020-11-09T14:00:00', '2020-11-09T15:30:00', 3, 50, 'A1')";
    // await db.pRun(sql);
    // // Insert booking
    // sql = "INSERT INTO Booking(CourseScheduleID, StudentID, BookStatus, Attended, Timestamp) VALUES(1, '275330', 1, 0, datetime('now', 'localtime'))";
    // await db.pRun(sql);
}

async function cleanDB(){
    let sql = "DELETE FROM sqlite_sequence";
    await db.pRun(sql);
    sql = "DELETE FROM Booking";
    await db.pRun(sql);
    sql = "DELETE FROM StudentCourse";
    await db.pRun(sql);
    sql = "DELETE FROM CourseSchedule";
    await db.pRun(sql);
    sql = "DELETE FROM Course";
    await db.pRun(sql);
    sql = "DELETE FROM User";
    await db.pRun(sql);
}

async function insertBooking(user, lecture) {
    let sql = 'INSERT INTO Booking(CourseScheduleID, StudentID, BookStatus, Attended, Timestamp)' +
        " VALUES(?, ?, 1, 0, datetime('now', 'localtime'))";
    let result = await db.pRun(sql, [lecture, user]);
    if(result)
        console.log(result);
    sql = "SELECT BookID FROM Booking";
    result = await db.pAll(sql);
    return result[result.length-1].BookID;
}

async function enrollStudentToCourse(student, course) {
    const sql = 'INSERT INTO StudentCourse(CourseID, StudentID) VALUES(?, ?)';
    let result = await db.pRun(sql, [course, student]);
    if(result)
        console.log(result);
}

async function insertStudent() {
    let sql = 'INSERT INTO User(UserID, FullName, UserName, Password, AccessLevel)' + 
        " VALUES('123456','Davide Falcone', 'davide.falcone@studenti.polito.it', '$2b$12$7iALJ38k/PBlAB7b8JDksu7v85z.tjnC9XfoMdUJd75bIId87Ip2S', 1)";
    let result = await db.pRun(sql);
    if(result)
        console.log(result);
    sql = 'SELECT UserID FROM User ORDER BY ID';
    result = await db.pAll(sql);
    return result[result.length-1].UserID;
}

async function insertCourseSchedule(course){
    let sql = "INSERT INTO CourseSchedule(CourseID, CourseStatus, CourseType, TimeStart, TimeEnd, OccupiedSeat, MaxSeat, Classroom)" +
        " VALUES(?, 1, 1, DATETIME('now', '+1 day', 'localtime'), DATETIME('now', '+1 day', '+1 hour', 'localtime'), 3, 50, 'A1')";
    let result = await db.pRun(sql, [course]);
    if(result)
        console.log(result);
    sql = 'SELECT CourseScheduleID FROM CourseSchedule';
    result = await db.pAll(sql);
    return result[result.length-1].CourseScheduleID;
}

async function insertCourse(name, teacher){
    let sql = 'INSERT INTO Course(CourseName, TeacherID) VALUES(?, ?)';
    let result = await db.pRun(sql, [name, teacher]);
    if(result)
        console.log(result);
    sql = 'SELECT CourseID FROM Course';
    result = await db.pAll(sql);
    return result[result.length-1].CourseID;
}

async function insertTeacher(){
    let sql = "INSERT INTO User(UserID, FullName, UserName, Password, AccessLevel) VALUES('654321', 'Mario Rossi', 'mario.rossi@polito.it', '$2b$12$7iALJ38k/PBlAB7b8JDksu7v85z.tjnC9XfoMdUJd75bIId87Ip2S', 2)";
    let result = await db.pRun(sql);
    if(result)
        console.log(result);
    sql = 'SELECT * FROM User';
    result = await db.pAll(sql);
    return result[result.length-1].UserID;
}

async function getUserEmail(userID){
    const sql = 'SELECT UserName FROM User WHERE UserID = ?';
    const result = await db.pGet(sql, [userID]);
    return result.UserName;
}

async function getLectureFromBooking(booking){
    const sql = 'SELECT * FROM Booking WHERE BookID = ?';
    const result = await db.pGet(sql, [booking]);
    return result.CourseScheduleID;
}
module.exports = {initDB, cleanDB, insertStudent, insertTeacher, insertCourse, insertCourseSchedule, insertBooking, enrollStudentToCourse, getUserEmail, getLectureFromBooking};