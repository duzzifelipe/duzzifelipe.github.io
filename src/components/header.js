import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import { useStaticQuery, graphql } from "gatsby"

const liStyle = {
  display: 'inline-block',
  marginLeft: 15,
  marginBottom: 0
}

const Header = ({ siteTitle }) => {
  const data = useStaticQuery(graphql`
    {
      allFile(filter: {extension: {eq: "svg"}, name: {in: ["github", "linkedin"]}}) {
        edges {
          node {
            publicURL
            name
          }
        }
      }
    }  
  `)

  const images = new Map(data.allFile.edges.map(edge => [edge.node.name, edge.node.publicURL]));

  return (
    <header style={{ marginBottom: `1.45rem` }}>
      <div
        style={{
          margin: `0 auto`,
          maxWidth: 960,
          padding: `0.75rem 1.0875rem`,
          textAlign: 'center'
        }}
      >
        <h3 style={{ margin: 0 }}>
          <Link
            to="/"
            style={{
              color: `black`,
              textDecoration: `none`,
            }}
          >
            {siteTitle}
          </Link>
        </h3>
        <ul style={{ listStyle: 'none', textAlign: 'center', margin: '10px 0 0' }}>
          <li style={{ ...liStyle, marginLeft: 0 }}>
            <a href="https://www.linkedin.com/in/duzzifelipe/" target="_blank" rel="noreferrer">
              <img src={images.get("linkedin")} alt="Linkedin" />
            </a>
          </li>
          <li style={liStyle}>
            <a href="https://github.com/duzzifelipe" target="_blank" rel="noreferrer">
              <img src={images.get("github")} alt="Github" />
            </a>
          </li>
        </ul>
      </div>
    </header>
  )
}

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
