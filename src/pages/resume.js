import React from "react"
import SEO from "../components/seo"
import "./resume.css"

const technologyKnowledge = [
  {
    title: "Elixir",
    text: "is currently my most used technology. Have been working on it professionally since 2019, creating mainly Phoenix projects. Had some diverse experience on that like integrating to Kafka, Prometheus, third-party API's libraries and some of the most used patterns like Ports and Adapters. On my free time I also dived into cool applications using GraphQL, decentralized communication and Scenic;"
  },
  {
    title: "Node.js",
    text: "used it on previous jobs to create microservices and solve smaller problems or routines, mainly running on serverless platforms. I made cool things with Node, using frameworks such as Express, Socket.IO, Sequelize and node-redis;"
  },
  {
    title: "Python",
    text: "used Python as a tool to generate some reports and for data transformations (for example aggregating database data into CSV). Also learned some introductory resources from Pandas and sklearn;"
  },
  {
    title: "Ruby",
    text: "worked with Ruby (on Rails) to create and mantain mainly CRUD systems;"
  },
  {
    title: "Fronted",
    text: "on job experiences and personal projects I always had to develop something related to frontend (like Ruby on Rails and Phoenix html pages for dashboards). Also developed some projects in React, React Native, Angular and Flutter;"
  },
  {
    title: "Infrastructure",
    text: "I'm not the best person with infrastructure, but in all projects I had been in, I used Docker, continuous integration (Github Actions and CircleCI) and cloud providers (AWS, gCloud and Heroku)."
  }
]

const professionalHistory = [
  {
    title: "Stone (jan/2020 - present)",
    text: "I joined Stone in a purely Elixir backend team. My first responsibility was to help the team to mantain an user validation platform (a process called KYC). After some while, the team received a responsibility to create a fraud prevention system and we all grew with that. I'm currently leading the Elixir backend team on this fraud prevention system;"
  },
  {
    title: "Thinkseg (dec/2018 - dec/2019)",
    text: "at Thinkseg my first role was helping to keep an insurance marketplace. It included supporting a front-end Ruby on Rails website and some small services in Node.js to communicate with each insurance company. At a second step, I joined an Elixir team to build a product for customized car insurance;"
  },
  {
    title: "CI&T (mar/2018 - dec/2018)",
    text: "after some time working alone, I decided to join an internship program to learn things related to team organization (such as Scrum) and CI&T was a great place for it. I worked on a team building systems with GeneXus (used to generate Cobol code) and, after some months, joined a React Native team (but left for another job in few weeks);"
  },
  {
    title: "Freelancer (jan/2017 - feb/2018)",
    text: "I left my previous job to focus my time on learning more things related to development and studying for the university course. At this time I still working as a consultant building websites and systems;"
  },
  {
    title: "Arpejo (mar/2015 - dec/2016)",
    text: "in Arpejo, an advertising agency, I started my career building templates for email-marketing, using just HTML and CSS. After some time I started creating websites (mostly a frontend effort) using Wordpress and PHP. After that, I built some systems (such as lead management dashboard) using Symfony (PHP) and Ruby on Rails."
  }
]

const ResumePage = () => {
  return (
    <>
      <SEO title="Resume" />
      <main id="resume">
        <div class="header">
          <h2 class="name">Felipe Eduardo Duzzi</h2>
          <div class="contact">
            <div class="table">
              <div>+55 19 99380 1380</div>
              <div>duzzifelipe@gmail.com</div>
            </div>
          </div>
        </div>
        <div class="badge">Fullstack Developer</div>
        <div class="badge">Education</div>
        <div class="content">
          <ul>
            <li>Computer Engineering - UNISAL (2015 - 2019);</li>
            <li>IT Certificate Program and High School - COTIL (2012 - 2014).</li>
          </ul>
        </div>
        <div class="badge">Technology Knowledge</div>
        <div class="content">
          <ul>
            {technologyKnowledge.map(knowledge => {
              return (
                <li>
                  <strong>{knowledge.title}:</strong> {knowledge.text}
                </li>
              )
            })}
          </ul>
        </div>
        <div class="badge">Professional History</div>
        <div class="content">
          <ul>
            {professionalHistory.map(job => {
              return (
                <li>
                  <strong>{job.title}:</strong> {job.text}
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </>
  )
}

export default ResumePage
