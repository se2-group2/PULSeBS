const express = require("express");//import express
const morgan = require("morgan"); // logging middleware
const userDao = require('./dao/userDao');
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const moment = require('moment');
const emailAPI = require('./emailAPI');
const bookingDao = require('./dao/bookingDao');
const dailyMailer = require('./dailyMailer');
const teacherDao = require('./dao/teacherDao');
const emailDao = require('./dao/emailDao');
const officerDao = require('./dao/officerDao');
const path = require('path');

const jwtSecret = '123456789';
const expireTime = 900; //seconds

const app = express();

app.use(morgan("tiny", { skip: (req, res) => process.env.NODE_ENV === 'test' }));// Set-up logging
app.use(express.json({ limit: '50mb' }));// Process body content
app.use(cookieParser());

// LOGIN API
app.post('/users/authenticate', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (!username) {
        res.status(500).json({ error: 'Missing username' });
        return;
    }
    if (!password) {
        res.status(500).json({ error: 'Missing password' });
        return;
    }

    try {
        const user = await userDao.getUser(username, password);
        if (user === undefined) {
            res.status(401).send({ error: 'Invalid username' });
            return;
        }
        else {
            if (!userDao.checkPassword(user, password)) {
                res.status(401).send({ error: 'Invalid password' });
                return;
            }
            else {
                // AUTHENTICATION SUCCESS
                const token = jsonwebtoken.sign({ user: user.personId }, jwtSecret, { expiresIn: expireTime });
                res.cookie('token', token, { httpOnly: true, sameSite: true, maxAge: 1000 * expireTime });
                res.status(200).json({ id: user.personId, username: user.email, fullname: user.fullName, accessLevel: user.accessLevel, hasDoneTutorial: user.hasDoneTutorial });
            }
        }

    }
    catch (error) {
        res.status(500).json({ msg: "Server error!" });
    }
});

app.use(cookieParser());

app.post('/logout', (req, res) => {
    res.clearCookie('token').end();
});

// For the rest of the code, all APIs require authentication
app.use(
    jwt({
        secret: jwtSecret,
        algorithms: ['sha1', 'RS256', 'HS256'],
        getToken: req => req.cookies.token
    })
);

//PLACE HERE ALL APIs THAT REQUIRE AUTHENTICATION
// DELETE A BOOKING 
app.delete('/deleteBooking/:lessonID', (req, res) => {
    const lessonID = req.params.lessonID;
    bookingDao.deleteBooking(lessonID, req.user.user)
        .then(bookingDao.checkWaitingList(lessonID).
            then((result) => {
                if (result === 0) {
                    res.status(200).json();
                }
                else {
                    // a new student has been extracted from the waiting queue
                    // so he needs to be notified
                    emailDao.getLectureInfo(result.lectureID)
                        .then((info) => {
                            userDao.getUserByID(result.studentID)
                                .then((userData) => {
                                    info.notificationType = 4;
                                    emailAPI.sendNotification(userData.email, info);
                                    res.status(204).json();
                                })
                        });
                }
            }))
        .catch((err) => res.status(500).json({ error: 'Server error: ' + err }));
});

app.get('/studentCourses', async (req, res) => {
    try {
        const result = await bookingDao.getStudentCourses(req.user.user);
        res.json(result);
    } catch (e) {
        res.status(505).end();
    }
});

// API for getting bookable lectures for a given student
app.get('/myBookableLessons', async (req, res) => {
    try {
        const result = await bookingDao.getBookableLessons(req.user.user);
        res.json(result);
    }
    catch (e) {
        res.status(505).end();
    }
});

// API for retrieving lessons booked by a student
app.get('/myBookedLessons', async (req, res) => {
    try {
        const result = await bookingDao.getBookedLessons(req.user.user);
        res.json(result);
        return;
    }
    catch (e) {
        res.status(505).end();
    }
});

// API for retrieving pending waiting lessons booked by a student
app.get('/myWaitingBookedLessons', async (req, res) => {
    try {
        const result = await bookingDao.getPendingWaitingBookings(req.user.user);
        res.json(result);
    }
    catch (e) {
        res.status(505).end();
    }
});

app.put('/setTutorialCompleted', async (req, res) => {
    try {
        await userDao.setTutorialCompleted(req.user.user);
        res.status(200).end();
    }
    catch (err) {
        res.status(401).json(err.message);
    }
});


//statistics
app.get('/coursesStatistics', async (req, res) => {
    try {
        const result = await teacherDao.getCoursesStatistics(req.user.user);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(505).end();
    }
});

app.get('/lessonsStatistics', async (req, res) => {
    try {
        const result = await teacherDao.getLessonsStatistics(req.user.user);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(505).end();
    }
});


//booking manager

app.post('/generateStudentTracing', async (req, res) => {
    const studentID = req.body.studentID;
    const downloadType = req.body.downloadType;
    try {
        const fileName = await bookingDao.generateStudentTracing(studentID, downloadType.toLowerCase());
        console.log(fileName)
        const options = { root: path.join(__dirname, 'files'), dotfiles: 'deny', headers: { 'x-timestamp': Date.now(), 'x-sent': true } }
        res.sendFile(fileName, options);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/generateTeacherTracing', async (req, res) => {
    const teacherID = req.body.teacherID;
    const downloadType = req.body.downloadType;
    try {
        const fileName = await bookingDao.generateTeacherTracing(teacherID, downloadType.toLowerCase());
        console.log(fileName)
        const options = { root: path.join(__dirname, 'files'), dotfiles: 'deny', headers: { 'x-timestamp': Date.now(), 'x-sent': true } }
        res.sendFile(fileName, options);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});



//Teacher APIs
app.get('/teacherCourses', async (req, res) => {
    try {
        const result = await teacherDao.getTeacherCourses(req.user.user);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(505).end();
    }
});

app.get('/myCoursesLessons', async (req, res) => {
    try {
        const result = await teacherDao.getMyCoursesLessons(req.user.user);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(505).end();
    }
});

app.post('/bookedStudents', async (req, res) => {
    const CourseScheduleIDs = req.body.lessonsIds;
    try {
        const result = await teacherDao.getBookedStudents(CourseScheduleIDs);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/studentsData', async (req, res) => {
    const studentsIds = req.body.studentsIds;
    try {
        const result = await teacherDao.getStudentsData(studentsIds);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.put('/makeLessonRemote/:courseScheduleId', async (req, res) => {
    const status = (req.body.status || 0);
    const courseScheduleId = req.params.courseScheduleId;
    try {
        const result = await teacherDao.updateLessonType(courseScheduleId, status);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(401).json(err.message);
    }
});

app.delete('/cancelLesson/:courseScheduleId', async (req, res) => {
    const status = (req.body.status || 0);
    const courseScheduleId = req.params.courseScheduleId;
    try {
        const result = await teacherDao.updateLessonStatus(courseScheduleId, status);
        if (result === 1) {
            await teacherDao.cancelAllBooking(courseScheduleId);

            // handle email notification to all booked students
            const emails = await emailDao.getStudentsToNotify(courseScheduleId);
            const info = await emailDao.getLectureInfo(courseScheduleId);
            info.notificationType = 3;
            emails.forEach((email) => {
                emailAPI.sendNotification(email.UserName, info);
            });
        }
        res.status(200).json(result);
        return;
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.put('/setStudentAsPresent', async (req, res) => {
    const lessonId = req.body.lessonId;
    const studentId = req.body.studentId;
    try {
        const result = await teacherDao.setStudentAsPresent(lessonId, studentId);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(401).json(err.message);
    }
});

app.put('/setStudentAsNotPresent', async (req, res) => {
    const lessonID = req.body.lessonId;
    const studentID = req.body.studentId;
    try {
        const result = await teacherDao.setStudentAsNotPresent(lessonID, studentID);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(401).json(error);
    }
});

// return true if lecture booked, false if student put into waiting list
app.post('/bookLesson', async (req, res) => {
    try {
        const userID = req.user.user;
        const lectureID = req.body.lessonId;
        const booked = await bookingDao.bookLesson(userID, lectureID);
        const user = await userDao.getUserByID(userID);
        const lectureData = await bookingDao.getLectureDataById(lectureID);
        const email = user.email;
        if (!booked) {
            res.json(false);
            return;
        }
        else {
            const info = {
                notificationType: 1,
                course: lectureData.CourseName,
                date: moment(lectureData.TimeStart).format('MM/DD/YYYY'),
                start: moment(lectureData.TimeStart).format('HH:mm'),
                end: moment(lectureData.TimeEnd).format('HH:mm')
            }
            emailAPI.sendNotification(email, info);
            res.json(true);
            return;
        }

    } catch (err) {
        res.status(505).json({ error: 'Server error: ' + err });
    }
});




//OFFICER API
app.put('/editLesson', async (req, res) => {
    const scheduleId = req.body.scheduleId;
    const courseId = req.body.courseId;
    const lessonStatus = (req.body.lessonStatus === "true");
    const lessonType = (req.body.lessonType === "true");
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const classroom = req.body.classroom;
    try {
        const result = await officerDao.editLesson(scheduleId, courseId, lessonStatus, lessonType, startDate, endDate, classroom);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(401).json(err.message);
    }
});

app.post('/createNewClassroom', async (req, res) => {
    const classRoomName = req.body.classRoomName;
    const maxSeats = req.body.maxSeats;
    try {
        const result = await officerDao.createNewClassroom(classRoomName, maxSeats);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/createNewEnrollment', async (req, res) => {
    const studentId = req.body.studentId;
    const courseId = req.body.courseId;
    try {
        const result = await officerDao.createNewEnrollment(studentId, courseId);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/createNewCourse', async (req, res) => {
    const courseName = req.body.courseName;
    const teacherId = req.body.teacherId;
    const year = (req.body.year || 1);
    const semester = (req.body.semester || 1);
    try {
        const result = await officerDao.createNewCourse(year, semester, courseName, teacherId);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/createNewUser', async (req, res) => {
    const userId = req.body.userId;
    const fullName = req.body.fullName;
    const email = req.body.email;
    const password = req.body.password;
    const type = req.body.type;
    try {
        const result = await officerDao.createNewUser(userId, fullName, email, password, type);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.post('/createNewLesson', async (req, res) => {
    const courseId = req.body.courseId;
    const errorLessonStatus = req.body.errorLessonStatus;
    const lessonType = req.body.lessonType;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const classroom = req.body.classroom;
    try {
        const result = await officerDao.createNewLesson(courseId, errorLessonStatus, lessonType, startDate, endDate, classroom);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json(err.message);
    }
});

app.get('/allClassrooms', async (req, res) => {
    try {
        const classes = await officerDao.getClassrooms();
        res.json(classes);
    }
    catch (error) {
        res.status(505).json(error);
    }
});

app.get('/allCourses', async (req, res) => {
    try {
        const classes = await officerDao.getCourses();
        res.json(classes);
    }
    catch (error) {
        res.status(505).json(error);
    }
});

app.get('/allStudents', async (req, res) => {
    try {
        const students = await officerDao.getUsers(1);
        res.json(students);
    }
    catch (error) {
        res.status(505).json(error);
    }
});

app.get('/allTeachers', async (req, res) => {
    try {
        const teachers = await officerDao.getUsers(2);
        res.json(teachers);
    }
    catch (error) {
        res.status(505).json(error);
    }
});

app.get('/allLessons', async (req, res) => {
    try {
        const lessons = await officerDao.getLessons();
        res.json(lessons);
    }
    catch (error) {
        res.status(505).json(error);
    }
});

app.get('/allEnrollments', async (req, res) => {
    try {
        const enrollments = await officerDao.getEnrollments();
        res.json(enrollments);
    }
    catch (error) {
        res.status(505).json(error)
    }
});

app.get('/allCoursesSchedules', async (req, res) => {
    try {
        const schedules = await officerDao.getSchedules();
        res.json(schedules);
    }
    catch (error) {
        res.status(505).json(error)
    }
});

app.post('/uploadFileCourses', async (req, res) => {

    const file = req.body.file;
    const newCourses = officerDao.readFile(file, 'courses');
    if (!newCourses) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewCourses(newCourses);
            res.status(200).end();
        }
        catch (err) {
            res.status(505).json(err);
        }
    }
});

app.post('/uploadFileLessons', async (req, res) => {

    const file = req.body.file;
    const newLessons = officerDao.readFile(file, 'lessons');
    if (!newLessons) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewSchedules(newLessons);
            await officerDao.insertNewGeneralSchedules(newLessons);
            res.status(200).end();
        }
        catch (err) {
            res.status(505).json(err);
        }
    }
});

app.post('/uploadFileStudents', async (req, res) => {

    const file = req.body.file;
    const newStudents = officerDao.readFile(file, 'students');
    if (!newStudents) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewUsers(newStudents, 1);
            res.status(200).end();
        }
        catch (err) {
            console.log(err)
            res.status(505).json(err);
        }
    }
});

app.post('/uploadFileTeachers', async (req, res) => {

    const file = req.body.file;
    const newTeachers = officerDao.readFile(file, 'teachers');
    if (!newTeachers) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewUsers(newTeachers, 2);
            res.status(200).end();
        }
        catch (err) {
            res.status(505).json(err);
        }
    }
});

app.post('/uploadFileEnrollment', async (req, res) => {

    const file = req.body.file;
    const newEnronllments = officerDao.readFile(file, 'enrollment');
    if (!newEnronllments) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewEnrollments(newEnronllments);
            res.status(200).end();
        }
        catch (err) {
            res.status(505).json(err);
        }
    }
});

app.post('/uploadFileClassroom', async (req, res) => {

    const file = req.body.file;
    const newRooms = officerDao.readFile(file, 'classrooms');
    if (!newRooms) {
        res.status(505).json('Wrong file uploaded!');
    }
    else {
        try {
            await officerDao.insertNewRooms(newRooms);
            res.status(200).end();
        }
        catch (err) {
            res.status(505).json(err);
        }
    }
});

app.post('/createNewEnrollment', async (req, res) => {
    const enrollment = req.body;
    try {
        await officerDao.createEnrollment(enrollment);
        res.status(200).end();
    }
    catch (err) {
        console.log(err)
        res.status(505).json(err);
    }
});

app.put('/editCourseSchedule', async (req, res) => {
    const { scheduleId, ...newData } = req.body;
    try {
        await officerDao.updateAllSchedules(scheduleId, newData);
        res.status(200).end();
    }
    catch (error) {

    }
});

app.delete('/deleteCourseSchedule/:deletedSchedule', async (req, res) => {
    const deletedId = req.params.deletedSchedule;
    try {
        await officerDao.deleteSchedules(deletedId);
        res.status(200).end();
    }
    catch (error) {
        res.status(505).json(error);
    }

});

app.post('/createCourseSchedule', async (req, res) => {

    const newSchedule = req.body;
    try {
        await officerDao.createNewSchedule(newSchedule);
        res.status(200).end();
    }
    catch (error) {
        console.log(error)
        res.status(505).json(error);
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token').end();
});

/////////////////////////////////////////////////////////////////////////////////////////////////

// set automatc email sending to professors
dailyMailer.setDailyMail();

module.exports = app;