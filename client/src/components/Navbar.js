import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import {NavLink} from 'react-router-dom';
import { AuthContext } from '../_services/AuthContext'

const navbar = (props) => {
    return (
        <AuthContext.Consumer>
            {(context) => (
                <Navbar bg="dark" variant="dark" expand="md">
                    <Navbar.Toggle data-toggle="collapse" data-target="#sidebar" aria-controls="sidebar" aria-expanded="false" aria-label="Toggle navigation" />
                    <Navbar.Brand>
                        PULSeBS Project
                    </Navbar.Brand>

                    {context.user &&
                        <Nav className="mr-auto">
                            {context.hasDoneTutorial && 
                            <>
                                {context.isStudent && <>
                                    <Nav.Link as={NavLink} to="/myBookableLessonsList"> Book a lesson!</Nav.Link> 
                                    <Nav.Link as={NavLink} to="/myBookedLessonslist"> My booked lessons</Nav.Link>
                                </>}
                                {context.isTeacher && <>
                                    <Nav.Link as={NavLink} to="/myCoursesLessonslist"> My courses details</Nav.Link>
                                </>}
                                {context.isBookingManager && <>
                                    <Nav.Link as={NavLink} to="/monitorUsage"> Monitor usage of the system</Nav.Link>
                                    <Nav.Link as={NavLink} to="/generateContactTracing"> Generate contact tracing</Nav.Link>
                                </>}
                                {context.isSupportOfficer && <>
                                    <Nav.Link as={NavLink} to="/configureStudentsList"> Students</Nav.Link>
                                    <Nav.Link as={NavLink} to="/configureCoursesList"> Courses</Nav.Link>
                                    <Nav.Link as={NavLink} to="/configureTeachersList"> Teachers</Nav.Link>
                                    <Nav.Link as={NavLink} to="/configureLessonsList"> Lessons</Nav.Link>
                                    <Nav.Link as={NavLink} to="/configureClassesList"> Classes</Nav.Link>
                                    <Nav.Link as={NavLink} to="/configureClassroomsList"> Classrooms</Nav.Link>
                                </>}
                            </>}   
                            {!context.hasDoneTutorial && 
                            <>
                                <Navbar.Brand>
                                    | Tap on the image to go to the next tutorial image! |
                                </Navbar.Brand> 
                            </>}                         
                        </Nav>
                    }
                    
                    <Nav className="ml-md-auto">
                        {context.user &&
                            <>
                                <Navbar.Brand>
                                    Welcome {context.user.fullname ? context.user.fullname : context.user.name}!
                                </Navbar.Brand> 
                                {context.isStudent && <>
                                    <Nav.Link as={NavLink} to="/studentTutorial" onClick={() => props.changeLocalTutorialFlag(false)}> Re-Watch the tutorial!</Nav.Link> 
                                </>}
                                {context.isTeacher && <>
                                    <Nav.Link as={NavLink} to="/teacherTutorial" onClick={() => props.changeLocalTutorialFlag(false)}> Re-Watch the tutorial!</Nav.Link>
                                </>}
                                <Nav.Link onClick = {() => {
                                    context.logoutUser();
                                }}>Logout</Nav.Link>
                            </>}
                        {!context.user && <Nav.Link as = {NavLink} to = "/login">Login</Nav.Link>}
                    </Nav>
                </Navbar>
            )}
        </AuthContext.Consumer>
    );
}

export default navbar;