import React, { useState, useEffect } from "react"
import { regressionExp } from "d3-regression"
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip
} from "recharts"

import stateNames from "./stateNames.json"
import "./styles.css"

function parseDate(dateInteger) {
  const s = dateInteger.toString()
  return new Date(s.slice(0, 4), s.slice(4, 6) - 1, s.slice(6, 8))
}

export default function App() {
  const [state, setState] = useState(null)

  useEffect(() => {
    async function fetchData() {
      let region = "US"
      if (window.location.pathname.length > 1) {
        region = window.location.pathname.slice(1).toUpperCase()
      }

      const response = await fetch(
        region === "US"
          ? "https://covidtracking.com/api/us/daily"
          : `https://covidtracking.com/api/states/daily?state=${region}`
      )
      let data = (await response.json())
        .filter(obs => obs.positive > 0)
        .sort((a, b) => a.date - b.date)
        .map((obs, timeIndex) => ({
          ...obs,
          date: parseDate(obs.date),
          timeIndex
        }))

      const regression = regressionExp()
        .x(obs => obs.timeIndex)
        .y(obs => obs.positive)(data)
      const doublingTime = Math.log(2) / regression.b
      const c0 = regression.a
      const daysUntil = n =>
        Math.ceil(
          (doublingTime * Math.log(n / c0)) / Math.log(2) -
            data[data.length - 1].timeIndex
        )
      const rSquared = regression.rSquared

      const regressionM5 = regressionExp()
        .x(obs => obs.timeIndex)
        .y(obs => obs.positive)(data.slice(0, data.length - 5))
      const doublingTimeM5 = Math.log(2) / regressionM5.b

      data = data.map(obs => ({
        ...obs,
        cFit: c0 * Math.pow(2, obs.timeIndex / doublingTime)
      }))
      const baseDate = new Date(data[0].date.toString())

      setState({
        data,
        region,
        baseDate,
        rSquared,
        daysUntil,
        doublingTime,
        doublingTimeM5,
        c0
      })
    }
    if (state == null) {
      fetchData()
    }
  }, [state])

  if (state) {
    const asOfDate = new Date(state.data[state.data.length - 1].date)

    const daysUntil100 = state.daysUntil(331e6)
    let dateOf100 = new Date(Number(asOfDate))
    dateOf100.setDate(asOfDate.getDate() + daysUntil100)

    const daysUntil1 = state.daysUntil(331e6 / 100)
    let dateOf1 = new Date(Number(asOfDate))
    dateOf1.setDate(asOfDate.getDate() + daysUntil1)

    const daysUntilNoBeds = state.daysUntil(924107 / 0.12)
    let dateOfNoBeds = new Date(Number(asOfDate))
    dateOfNoBeds.setDate(asOfDate.getDate() + daysUntilNoBeds)

    // let status = "No."
    // if (state.rSquared < 0.8) {
    //   status = "Yes!?"
    // } else if (state.rSquared < 0.9) {
    //   status = "Maybe!?"
    // }

    const regionName =
      state.region === "US" ? "the United States" : stateNames[state.region]

    return (
      <>
        <div key={state.region} style={{ width: "2em", float: "right" }}>
          {Object.keys(stateNames).map(stateCode => (
            <>
              <a key={stateCode} href={`/${stateCode}`}>
                {stateCode}
              </a>
              {stateCode === "US" && <br />}
              <br />
            </>
          ))}
        </div>
        <div
          style={{
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          <div
            style={{
              textAlign: "center",
              width: "400px",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            <h2>Have We Flattened the COVID-19 Curve in {regionName}?</h2>
            {/* <h2 style={{ color: "red" }}>{status}</h2> */}
            <p>As of {asOfDate.toDateString()}</p>
            <ComposedChart data={state.data} width={400} height={400}>
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="timeIndex"
                name={`Days Since ${state.baseDate.toDateString()}`}
                domain={["dataMin", "dataMax"]}
                unit=""
              />
              <YAxis
                type="number"
                dataKey="positive"
                name="Number of Confirmed COVID-19 Cases"
                unit=""
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="Positive Cases" dataKey="c" fill="black" />
              <Line
                name={
                  <span>
                    ~2<sup>t/{state.doublingTime.toFixed(3)}</sup>
                  </span>
                }
                dataKey="cFit"
                stroke="blue"
                dot={false}
              />
              <Legend verticalAlign="top" height={36} />
            </ComposedChart>
            <div style={{ fontSize: "smaller", fontStyle: "italic" }}>
              Days Since First Reported Positive <br />(
              {state.baseDate.toDateString()})
            </div>
          </div>
          <br />
          <p>
            The growth rate of the number of new COVID-19 cases in {regionName}{" "}
            has a <strong>{(100 * state.rSquared).toFixed(0)}%</strong> fit to
            exponential growth and appears to be doubling every{" "}
            <strong>{state.doublingTime.toFixed(2)} days</strong>.
          </p>
          <p>
            The doubling time 5 days ago was{" "}
            <strong>{state.doublingTimeM5.toFixed(2)} days</strong>. The
            doubling time is{" "}
            {state.doublingTime > state.doublingTimeM5
              ? "is increasing, which is encouraging!"
              : "is decreasing, which is worrisome."}
          </p>
          {state.region === "US" ? (
            <>
              <p>
                The United States will reach 1% infection on{" "}
                <strong>{dateOf1.toDateString()}</strong> if unabated
                exponential growth continues.
              </p>
              <p>
                Unabated, we will run out of hospital beds on{" "}
                <strong>{dateOfNoBeds.toDateString()}</strong> assuming a 12%
                hospitalization rate.
              </p>
              <p>
                The United States will reach 100% infection on{" "}
                <strong>{dateOf100.toDateString()}</strong> if unabated
                exponential growth continues.
              </p>
            </>
          ) : null}
          <p>
            It's important to understand that confirmed cases lag new infections
            by about 5 days (the incubation period), so this is a trailing
            indicator that tells us how well we were controlling the spread a
            week ago.
          </p>
          <br />
          <br />
          <div>
            References:
            <ul>
              <li>
                Data Source:{" "}
                <a href="https://covidtracking.com/">
                  https://covidtracking.com/
                </a>
              </li>
              <li>
                COVID-19 median incubation period:{" "}
                <a href="https://www.sciencedaily.com/releases/2020/03/200317175438.htm">
                  https://www.sciencedaily.com/releases/2020/03/200317175438.htm
                </a>
              </li>
              {state.region === "US" ? (
                <>
                  <li>
                    Number of Hospital Beds in the United States:{" "}
                    <a href="https://www.aha.org/statistics/fast-facts-us-hospitals">
                      https://www.aha.org/statistics/fast-facts-us-hospitals
                    </a>
                  </li>
                  <li>
                    Hospitalization rates of COVID-19 in the United States:{" "}
                    <a href="https://www.cdc.gov/mmwr/volumes/69/wr/mm6912e2.htm">
                      https://www.cdc.gov/mmwr/volumes/69/wr/mm6912e2.htm
                    </a>
                  </li>
                  <li>
                    Number of Hospital Beds in the United States:{" "}
                    <a href="https://www.aha.org/statistics/fast-facts-us-hospitals">
                      https://www.aha.org/statistics/fast-facts-us-hospitals
                    </a>
                  </li>
                  <li>
                    United States Population:{" "}
                    <a href="https://www.worldometers.info/world-population/us-population/">
                      https://www.worldometers.info/world-population/us-population/
                    </a>
                  </li>
                </>
              ) : null}
              <li>
                Exponential Growth:{" "}
                <a href="https://en.wikipedia.org/wiki/Exponential_growth">
                  https://en.wikipedia.org/wiki/Exponential_growth
                </a>
              </li>
            </ul>
          </div>
          <br />
          <br />
          <div style={{ textAlign: "center", fontStyle: "italic" }}>
            Created by{" "}
            <a href="https://twitter.com/alexsauerbudge">alexsauerbudge</a>.
            <br />
            Provided "as is" with all faults and no guarantee of accuracy,
            correctness, or fitness for any purpose.
          </div>
          {/* {series.map((total, index) => (
          <div key={index}>
            {indexes[index]}, {total}
          </div>
        ))} */}
        </div>
      </>
    )
  } else {
    return <div>Loading...</div>
  }
}
