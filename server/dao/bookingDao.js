'use strict'
const db = require('../db');
const LessonData = require('./LessonsData.js');
const CourseData = require('./CourseData.js');
const moment = require('moment');

exports.getBookableLessons = function (studentID) {
    return new Promise((resolve, reject) => {
        const sql =
            "SELECT CS.CourseScheduleID, CS.CourseId, Classroom, OccupiedSeat, MaxSeat, TimeStart, TimeEnd " +
            "FROM CourseSchedule CS, StudentCourse SC " +
            "WHERE CS.CourseID=SC.CourseID AND SC.StudentID=? AND CourseStatus=true " +
            "AND CS.CourseType=1 AND CS.CourseScheduleID NOT IN (" +
            "SELECT CourseScheduleID FROM Booking B WHERE StudentID=? AND BookStatus = 1)";
        db.all(sql, [studentID, studentID], function (err, rows) {
            if (err) {
                reject();
            }
            const availableLessons = rows.filter(row => checkStart(row.TimeStart))
                .map((row) => new LessonData(row.CourseScheduleID, row.CourseID,
                    row.TimeStart, row.TimeEnd, row.OccupiedSeat, row.MaxSeat));
            resolve(availableLessons);
        });
    });
}

exports.getBookedLessons = function (studentID) {
    return new Promise((resolve, reject) => {
        const sql =
            "SELECT CS.CourseScheduleID, CS.CourseID, Classroom, OccupiedSeat, MaxSeat, TimeStart, TimeEnd " +
            "FROM CourseSchedule CS, StudentCourse SC " +
            "WHERE CS.CourseID=SC.CourseID AND SC.StudentID=? AND CourseStatus=true " +
            "AND CS.CourseType=1 AND CS.CourseScheduleID IN (" +
            "SELECT CourseScheduleID FROM Booking WHERE StudentID=? AND BookStatus = 1)"
        db.all(sql, [studentID, studentID], function (err, rows) {
            if (err) {
                reject();
            }
            const myLessons = rows.filter(row => checkStart(row.TimeStart))
                .map((row) =>
                    new LessonData(row.CourseScheduleID, row.CourseID,
                        row.TimeStart, row.TimeEnd, row.OccupiedSeat, row.MaxSeat));
            resolve(myLessons);
        });
    });
}

exports.getStudentCourses = function (studentID) {
    return new Promise((resolve, reject) => {
        const sql =
            "SELECT C.CourseId, CourseName, TeacherId FROM Course C, StudentCourse SC WHERE C.CourseId = SC.CourseId AND SC.StudentID = ?";
        db.all(sql, [studentID], function (err, rows) {
            if (err) {
                reject();
            }
            const myCourses = rows.map((row) => new CourseData(row.CourseID, row.CourseName,
                row.TeacherId));
            resolve(myCourses);
        });
    });
}

exports.bookLesson = function (studentID, lessonID) {
    return new Promise((resolve, reject) => {
        let sql = `
        SELECT * FROM Booking 
        WHERE Booking.CourseScheduleID = ? AND Booking.StudentID = ?`;

        db.all(sql, [lessonID, studentID], function (err, row) {
            if (err) {
                reject(err);
                return;
            }
            if (row.length > 0) {// if there is a booking for this student that canceled by him befor (if status == 2)            
                sql = `
                UPDATE Booking
                SET BookStatus = 1
                WHERE Booking.CourseScheduleID = ? AND Booking.StudentID = ?`

                //switch the status to 1
                db.run(sql, [lessonID, studentID], function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                })
            }
            if (row.length < 1) {// for this student there is no record in Booking, so a new record should be inserted                
                sql = `INSERT INTO Booking(CourseScheduleID, StudentID, BookStatus, attended) VALUES(?, ?, 1, 0)`;

                //insert new record in Booking
                db.run(sql, [lessonID, studentID], function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                });
            }

            sql = `
            UPDATE CourseSchedule 
            SET OccupiedSeat = OccupiedSeat + 1
            WHERE CourseScheduleID = ? AND OccupiedSeat <> MaxSeat`;

            //any way increase the OccupiedSeat
            db.run(sql, [lessonID], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                else {
                    resolve('Success');
                }
            });

        });
    });
}

exports.deleteBooking = (lessonID, studentID) => {
    return new Promise((resolve, reject) => {
        if (!lessonID || !studentID) {
            reject('Missing data');
        }

        let sql = `UPDATE Booking 
                   SET BookStatus = 2 
                   WHERE CourseScheduleID = ? AND StudentID = ?`;

        db.run(sql, [lessonID, studentID], function(err) {
            if (err) {
                reject(err);
                return;
            }
            else {  
                if(this.changes === 0){
                    reject('NO BOOKING');
                    return;
                }
                sql = `UPDATE CourseSchedule 
                        SET OccupiedSeat = OccupiedSeat - 1
                        WHERE CourseScheduleID = ?`;
                db.run(sql, [lessonID], (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve('Success');
                    }
                })

            }
        });
    });
}

exports.getLectureDataById = (lectureID) => {

    return new Promise((resolve, reject) => {

        if (!lectureID) {
            reject('Missing data');
        }
        else {
            const sql = `SELECT CS.TimeStart, CS.TimeEnd, C.CourseName 
                         FROM CourseSchedule CS, Course C 
                         WHERE CS.CourseScheduleID = ? AND   
                               CS.CourseID = C.CourseID`;
            db.get(sql, [lectureID], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        }
    });
}

const checkStart = (startDate) => {
    const now = moment();
    return moment(startDate).isAfter(now);
}