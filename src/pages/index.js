import React from "react"
import { Link } from "gatsby"
import { useStaticQuery, graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => {
  const posts = useStaticQuery(graphql`
    query PostList {
      allMarkdownRemark(sort: {order: DESC, fields: [frontmatter___date]}) {
        edges {
          node {
            frontmatter {
              slug
              date(formatString: "DD/MM/YYYY")
              title
            }
          }
        }
      }
    }
  `)

  return (
    <Layout>
      <SEO title="Home" />
      <h2>Posts</h2>
      <div className="post-list">
      {posts.allMarkdownRemark.edges.map(edge => {
        const front = edge.node.frontmatter

        return (
          <div>
            <Link to={'posts/' + front.slug}>{front.title}</Link>
            <span>{front.date}</span>
          </div>
        )
      })}
      </div>
    </Layout>
  )
}

export default IndexPage
