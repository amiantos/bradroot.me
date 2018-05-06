import React from 'react'

class Bio extends React.Component {
    render() {
      return (
        <div
          style={{
            borderBottom: '1px solid #eee'
          }}
        >
          <p>
            <strong>
                Who? What?
            </strong>{' '}
            I'm just some dude living in Los Angeles. I build{' '}
            <a href="https://www.numutracker.com">
              Numu Tracker
            </a>{' '}
            and other things.
          </p>
        </div>
      )
    }
  }
  
  export default Bio