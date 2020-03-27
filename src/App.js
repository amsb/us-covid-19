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
  // eslint-disable-next-line
  const [region, setRegion] = useState(
    window.location.pathname.length > 1
      ? window.location.pathname.slice(1).toUpperCase()
      : "US"
  )
  const [data, setData] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  // eslint-disable-next-line
  const [variable, setVariable] = useState(
    window.location.search !== ""
      ? new URL(window.location).searchParams.get("variable")
      : "positive"
  )

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(
        region === "US"
          ? "https://covidtracking.com/api/us/daily"
          : `https://covidtracking.com/api/states/daily?state=${region}`
      )
      let data = (await response.json())
        .filter(obs => obs[variable] > 0)
        .sort((a, b) => a.date - b.date)
        .map((obs, timeIndex) => ({
          ...obs,
          date: parseDate(obs.date),
          timeIndex
        }))
      setData(data)
    }
    fetchData()
  }, [region, variable, setData])

  useEffect(() => {
    if (data) {
      const regression = regressionExp()
        .x(obs => obs.timeIndex)
        .y(obs => obs[variable])(data)
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
        .y(obs => obs[variable])(data.slice(0, data.length - 5))
      const doublingTimeM5 = Math.log(2) / regressionM5.b
      const baseDate = new Date(data[0].date.toString())
      const chartData = data.map(obs => ({
        ...obs,
        cFit: c0 * Math.pow(2, obs.timeIndex / doublingTime)
      }))

      setAnalysis({
        chartData,
        baseDate,
        rSquared,
        daysUntil,
        doublingTime,
        doublingTimeM5,
        c0
      })
    }
  }, [data, variable, setAnalysis])

  if (analysis) {
    const asOfDate = new Date(
      analysis.chartData[analysis.chartData.length - 1].date
    )

    const daysUntil100 = analysis.daysUntil(331e6)
    let dateOf100 = new Date(Number(asOfDate))
    dateOf100.setDate(asOfDate.getDate() + daysUntil100)

    const daysUntil1 = analysis.daysUntil(331e6 / 100)
    let dateOf1 = new Date(Number(asOfDate))
    dateOf1.setDate(asOfDate.getDate() + daysUntil1)

    const daysUntilNoBeds = analysis.daysUntil(924107 / 0.12)
    let dateOfNoBeds = new Date(Number(asOfDate))
    dateOfNoBeds.setDate(asOfDate.getDate() + daysUntilNoBeds)

    // let status = "No."
    // if (analysis.rSquared < 0.8) {
    //   status = "Yes!?"
    // } else if (analysis.rSquared < 0.9) {
    //   status = "Maybe!?"
    // }

    const regionName =
      region === "US" ? "the United States" : stateNames[region]

    return (
      <div key={region}>
        <div style={{ width: "2em", float: "right" }}>
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
            <ComposedChart data={analysis.chartData} width={400} height={400}>
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="timeIndex"
                name={`days since ${analysis.baseDate.toDateString()}`}
                domain={["dataMin", "dataMax"]}
                unit=""
              />
              <YAxis
                type="number"
                dataKey={variable}
                name={`number ${variable}s`}
                unit=""
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name={`${variable}s`} dataKey={variable} fill="black" />
              <Line
                name={
                  <span>
                    ~2<sup>t/{analysis.doublingTime.toFixed(3)}</sup>
                  </span>
                }
                dataKey="cFit"
                stroke="blue"
                dot={false}
              />
              <Legend verticalAlign="top" height={36} />
            </ComposedChart>
            <div style={{ fontSize: "smaller", fontStyle: "italic" }}>
              days since first reported {variable}
              <br />({analysis.baseDate.toDateString()})
            </div>
          </div>
          <br />
          <p>
            The growth rate of the number of new COVID-19 {variable}s in{" "}
            {regionName} has a{" "}
            <strong>{(100 * analysis.rSquared).toFixed(0)}%</strong> fit to
            exponential growth and appears to be doubling every{" "}
            <strong>{analysis.doublingTime.toFixed(2)} days</strong>.
          </p>
          <p>
            The doubling time 5 days ago was{" "}
            <strong>{analysis.doublingTimeM5.toFixed(2)} days</strong>. The
            doubling time is{" "}
            {analysis.doublingTime > analysis.doublingTimeM5
              ? "is increasing, which is encouraging!"
              : "is decreasing, which is worrisome."}
          </p>
          {region === "US" ? (
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
              {region === "US" ? (
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
      </div>
    )
  } else {
    return <div>Loading...</div>
  }
}
