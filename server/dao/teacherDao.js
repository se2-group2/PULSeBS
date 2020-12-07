'use strict';

const moment = require("moment");
const db = require('../db');


exports.getTeacherCourses = function (teacherID) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM Course WHERE TeacherID = ?";
        db.all(sql, [teacherID], function (err, rows) {
            if (err) {
                reject();
            }
            const courses = rows.map((row) => new CourseData(row.CourseID, row.CourseName, row.TeacherID));
            resolve(courses);
        });
    });
}

exports.getMyCoursesLessons = function (teacherID) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM CourseSchedule JOIN Course ON CourseSchedule.CourseID = Course.CourseID WHERE Course.TeacherID = ?";
        db.all(sql, [teacherID], function (err, rows) {
            if (err) {
                reject();
            }
            const lessons = rows.map((row) => new LessonsData(row.CourseScheduleID, row.CourseID, row.TimeStart, row.TimeEnd, row.OccupiedSeat, row.MaxSeat));
            resolve(lessons);
        });
    });
}

exports.getBookingStatistics = function (teacherID) {
    return new Promise((resolve, reject) => {
        const sql = `
        SELECT CS.CourseID, CAST(COUNT(BookID) AS FLOAT)/CAST(COUNT(DISTINCT STRFTIME("%m/%Y", CS.TimeStart)) AS FLOAT) AS MonthAvg, CAST(COUNT(BookID) AS FLOAT)/CAST(COUNT(DISTINCT STRFTIME("%W/%Y", CS.TimeStart)) AS FLOAT) AS WeekAvg,
        FROM Course C,CourseSchedule AS CS LEFT JOIN Booking AS B ON CS.CourseScheduleID = B.CourseScheduleID
        WHERE CS.CourseID = C.CourseID AND C.TeacherID= ?
        GROUP BY CS.CourseID
        `;
        db.all(sql, [teacherID], function (err, rows) {
            if (err) {
                reject();
            }
            let ret_array=[];
                for (let row of rows){
                    ret_array.push(
                        {
                            CourseID: row.courseId,
                            MonthAvg: row.MonthAvg.toFixed(2),
                            WeekAvg: row.WeekAvg.toFixed(2)
                        }
                    );
                }
            resolve(JSON.stringify(ret_array));
        });
    });
}

exports.getLectureAttendance = function (teacherID,CourseScheduleID){
    return new Promise((resolve,reject) =>{
        const sql=`
        SELECT CS.CourseScheduleID,COUNT(1) FILTER (WHERE B.attended= true) as PresentStudents, COUNT (*) as BookedStudents
        FROM Course C,CourseSchedule AS CS, Booking as B
        WHERE CS.CourseID = C.CourseID AND CS.CourseScheduleID = B.CourseScheduleID AND C.TeacherID= ? AND CS.CourseScheduleID=?
        `;
        db.all(sql, [teacherID,CourseScheduleID], function (err, rows) {
            if (err) {
                reject();
            }
            let ret_array=[];
            for (let row of rows){
                ret_array.push(
                    {
                        CourseScheduleID: row.CourseScheduleID,
                        PresentStudents: row.PresentStudents,
                        BookedStudents: row.BookedStudents
                    }
                );
            }
            resolve(JSON.stringify(ret_array));
         });
    });
}


exports.getBookedStudents = function (CourseScheduleIDs) {
    return new Promise((resolve, reject) => {

        //Check if the CourseScheduleIDs is an array
        if (!Array.isArray(CourseScheduleIDs)) {
            let err = { message: "" };
            err.message = "The received parameter (CourseScheduleIDs) is not an array!";
            reject(err);
            return;
        }
        ////////////////////////////////////////////////////////////////////////////
        const sql =
            `SELECT Booking.BookID,Booking.CourseScheduleID,Booking.StudentID,Booking.BookStatus,Booking.Attended 
        FROM CourseSchedule JOIN Booking
        ON CourseSchedule.CourseScheduleID = Booking.CourseScheduleID
        WHERE CourseSchedule.CourseScheduleID IN (${CourseScheduleIDs.map(i => '?')}) AND Booking.BookStatus = 1`;

        db.all(sql, [...CourseScheduleIDs], function (err, rows) {
            if (err) {
                reject(err);
                return;
            }
            const lessons = rows.map((row) => new BookingData(row.BookID, row.CourseScheduleID, row.StudentID, row.BookStatus, row.Attended));
            resolve(lessons);
        });
        ////////////////////////////////////////////////////////////////////////////
    });
}


exports.getStudentsData = function (studentsIds) {
    return new Promise((resolve, reject) => {

        //Check if the studentsIds is an array
        if (!Array.isArray(studentsIds)) {
            let err = { message: "" };
            err.message = "The received parameter (studentsIds) is not an array!";
            reject(err);
            return;
        }
        ////////////////////////////////////////////////////////////////////////////

        const sql = `SELECT * FROM User WHERE UserID IN (${studentsIds.map(i => '?')})`;

        db.all(sql, [...studentsIds], function (err, rows) {
            if (err) {
                reject();
            }
            const users = rows.map((row) => new UserData(row.ID, row.UserID, row.FullName, row.UserName));
            resolve(users);
        });
    });
}







////////////////////////////////////////////////////////////////////////////////////////////////////
class LessonsData {
    constructor(scheduleId, courseId, startingTime, endingTime, occupiedSeats, availableSeats) {
        if (scheduleId)
            this.scheduleId = scheduleId;
        this.courseId = courseId;
        this.startingTime = moment(new Date(startingTime));
        this.endingTime = moment(new Date(endingTime));
        this.occupiedSeats = occupiedSeats;
        this.availableSeats = availableSeats;
    }

    static fromJson(json) {
        const temp = Object.assign(new LessonData(), json);
        temp.startingTime = moment(new Date(temp.startingTime));
        temp.endingTime = moment(new Date(temp.endingTime));
        return temp;
    }
}

class UserData {
    constructor(id, personId, fullName, email) {
        if (id)
            this.id = id;
        this.personId = personId;
        this.fullName = fullName;
        this.email = email;
    }

    static fromJson(json) {
        const temp = Object.assign(new UserData(), json);
        return temp;
    }
}

class CourseData {
    constructor(courseId, courseName, teacherId) {
        if (courseId)
            this.courseId = courseId;
        this.courseName = courseName;
        this.teacherId = teacherId;
    }
}

class BookingData {
    constructor(id, scheduleId, studentId, status, attended) {
        if (id)
            this.id = id;
        this.scheduleId = scheduleId;
        this.studentId = studentId;
        this.status = status;
        this.attended = attended;
    }

    static fromJson(json) {
        const temp = Object.assign(new BookingData(), json);
        return temp;
    }
}