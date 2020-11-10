import React from 'react';
import {Navbar} from 'react-bootstrap';
import API from './API/API';
import LessonsList from './components/LessonsListPage';
import {Switch, Route, Redirect, withRouter} from 'react-router-dom';
import LoginPage from './components/LoginPage';
class App extends React.Component {

  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      user: null,
      loginError: false,
      lessons: [
        {
          id: "0",
          course: "Course 0",
          professor: "Professor 0",
          dateAndTime: "",
        },
        {
          id: "1",
          course: "Course 1",
          professor: "Professor 1",
          dateAndTime: "",
        },
        {
          id: "2",
          course: "Course 2",
          professor: "Professor 2",
          dateAndTime: "",
        },
      ],
      myBookedLessons: [

      ],
    };
  }

  componentDidMount() {
  }
  
  login = async (username, password) => {
    API.login(username, password)
    .then((user) =>{
      this.setState({user, loginError: false});
      this.props.history.push('/ticketdetails');
      //IF STUDENT        
        //fetch from back-end bookable lessons and my booked lessons
      //IF PROFESSOR
        //fetch from back-end data on my lessons and students booked to them
      //IF SUPPORT MANAGER
        //fetch from back-end something??? TODO
    })
    .catch((e) => {
      console.log(e);
      this.setState((state)=> {return {...state, user: null, loginError: true}});
    });
  }

  bookLesson = () => {
    console.log("This function simulates the booking of a lesson");
  }

  deleteLesson = () => {
    console.log("This function simulates the deletion of a lesson");
  }

  updateMyBookedLessonsList = () => {
    console.log("This function simulates the updating of my lessons list");
  }

  render() {
    //LOGIN IS THE FIRST PAGE
    return (
      <>
        <Navbar bg="dark" variant="dark">
          <Navbar.Brand>PUL Project</Navbar.Brand>
        </Navbar>
        <Switch>
          <Route path='/lessonslist'>
            <LessonsList lessonsList = {this.state.lessons} selectLessonFunction={this.bookLesson} updateMyBookedLessonsList={this.updateMyBookedLessonsList} isMyLessonsList={false}/>
          </Route>
          <Route path='/myBookedLessonslist'>
            <LessonsList lessonsList = {this.state.myBookedLessons} selectLessonFunction={this.deleteLesson} updateMyBookedLessonsList={this.updateMyBookedLessonsList} isMyLessonsList={true}/>
          </Route>
          {/* <Route path="/ticketdetails">
            {
              !this.state.user ? <Redirect to='/login'/> : <TicketDetails tickets={this.state.tickets} differentCounterIds = {this.state.differentCounterIds} 
                callNextCustomerFunction={API.callNextCustomer} updateTicketList={this.updateTicketList}/>
            }
          </Route> */}
          <Route path="/login">
            <LoginPage login={this.login} error={this.state.loginError}/>
          </Route>
        </Switch>
      </>
    );
  }
}
export default withRouter(App);
