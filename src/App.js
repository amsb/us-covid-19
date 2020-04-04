import React, { useState, useEffect } from "react"

import Paper from "@material-ui/core/Paper"
import Grid from "@material-ui/core/Grid"
import Container from "@material-ui/core/Container"
import CircularProgress from "@material-ui/core/CircularProgress"
import ExpansionPanel from "@material-ui/core/ExpansionPanel"
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary"
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails"
import Typography from "@material-ui/core/Typography"

import ExpandMoreIcon from "@material-ui/icons/ExpandMore"
import ArrowForwardIcon from "@material-ui/icons/ArrowForward"

import { Sparklines, SparklinesBars } from "react-sparklines"

import { regressionExp } from "d3-regression"
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  // YAxis,
  CartesianGrid,
  // Legend,
  Tooltip
} from "recharts"

import stateNames from "./stateNames.json"
import "./styles.css"

function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
}

function shortDateString(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function analyzeSeries(series, dates) {
  const data = series
    .map((value, timeIndex) => ({
      value,
      timeIndex
    }))
    .filter(
      (obs, index) =>
        obs.value &&
        obs.value > 0 &&
        (index === 0 || obs.value !== series[index - 1])
    )
  if (data.length >= 5) {
    const regression = regressionExp()
      .x(obs => obs.timeIndex)
      .y(obs => obs.value)(data)
    const doublingTime = Math.log(2) / regression.b
    const c0 = regression.a
    const daysUntil = n =>
      Math.ceil(
        (doublingTime * Math.log(n / c0)) / Math.log(2) -
          data[data.length - 1].timeIndex
      )
    const rSquared = regression.rSquared

    const chartData = data.map(obs => ({
      ...obs,
      date: dates[obs.timeIndex],
      fit: c0 * Math.pow(2, obs.timeIndex / doublingTime)
    }))

    return {
      rSquared,
      doublingTime,
      daysUntil,
      chartData
    }
  } else {
    return null
  }
}

function parseDate(dateInteger) {
  const s = dateInteger.toString()
  return new Date(s.slice(0, 4), s.slice(4, 6) - 1, s.slice(6, 8))
}

export default function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      let response = await fetch("https://covidtracking.com/api/states/daily")
      const data = groupBy(await response.json(), "state")

      response = await fetch("https://covidtracking.com/api/us/daily")
      data["US"] = await response.json()
      setData(data)
    }
    fetchData()
  }, [setData])

  // if (analysis) {
  //   const asOfDate = new Date(
  //     analysis.chartData[analysis.chartData.length - 1].date
  //   )

  //   const daysUntil100 = analysis.daysUntil(331e6)
  //   let dateOf100 = new Date(Number(asOfDate))
  //   dateOf100.setDate(asOfDate.getDate() + daysUntil100)

  //   const daysUntil1 = analysis.daysUntil(331e6 / 100)
  //   let dateOf1 = new Date(Number(asOfDate))
  //   dateOf1.setDate(asOfDate.getDate() + daysUntil1)

  //   const daysUntilNoBeds = analysis.daysUntil(924107 / 0.12)
  //   let dateOfNoBeds = new Date(Number(asOfDate))
  //   dateOfNoBeds.setDate(asOfDate.getDate() + daysUntilNoBeds)

  //   // let status = "No."
  //   // if (analysis.rSquared < 0.8) {
  //   //   status = "Yes!?"
  //   // } else if (analysis.rSquared < 0.9) {
  //   //   status = "Maybe!?"
  //   // }

  //   const regionName =
  //     region === "US" ? "the United States" : stateNames[region]

  //   return (
  //     <div key={region}>
  //       <div style={{ width: "2em", float: "right" }}>
  //         {Object.keys(stateNames).map(stateCode => (
  //           <>
  //             <a key={stateCode} href={`/${stateCode}`}>
  //               {stateCode}
  //             </a>
  //             {stateCode === "US" && <br />}
  //             <br />
  //           </>
  //         ))}
  //       </div>
  //       <div
  //         style={{
  //           maxWidth: "800px",
  //           marginLeft: "auto",
  //           marginRight: "auto"
  //         }}
  //       >
  //         <div
  //           style={{
  //             textAlign: "center",
  //             width: "400px",
  //             marginLeft: "auto",
  //             marginRight: "auto"
  //           }}
  //         >
  //           <h2>Have We Flattened the COVID-19 Curve in {regionName}?</h2>
  //           {/* <h2 style={{ color: "red" }}>{status}</h2> */}
  //           <p>As of {asOfDate.toDateString()}</p>
  //           <ComposedChart data={analysis.chartData} width={400} height={400}>
  //             <CartesianGrid />
  //             <XAxis
  //               type="number"
  //               dataKey="timeIndex"
  //               name={`days since ${analysis.baseDate.toDateString()}`}
  //               domain={["dataMin", "dataMax"]}
  //               unit=""
  //             />
  //             <YAxis
  //               type="number"
  //               dataKey={variable}
  //               name={`number ${variable}s`}
  //               unit=""
  //             />
  //             <Tooltip cursor={{ strokeDasharray: "3 3" }} />
  //             <Line
  //               dataKey={variable}
  //               stroke="black"
  //               dot={false}
  //             />
  //             <Scatter name={`${variable}s`} dataKey={variable} fill="black" />
  //             <Line
  //               name={
  //                 <span>
  //                   ~2<sup>t/{analysis.doublingTime.toFixed(3)}</sup>
  //                 </span>
  //               }
  //               dataKey="cFit"
  //               stroke="blue"
  //               dot={false}
  //             />
  //             <Legend verticalAlign="top" height={36} />
  //           </ComposedChart>
  //           <div style={{ fontSize: "smaller", fontStyle: "italic" }}>
  //             days since first reported {variable}
  //             <br />({analysis.baseDate.toDateString()})
  //           </div>
  //         </div>
  //         <br />
  //         <p>
  //           The growth rate of the number of new COVID-19 {variable}s in{" "}
  //           {regionName} has a{" "}
  //           <strong>{(100 * analysis.rSquared).toFixed(0)}%</strong> fit to
  //           exponential growth and appears to be doubling every{" "}
  //           <strong>{analysis.doublingTime.toFixed(2)} days</strong>.
  //         </p>
  //         <p>
  //           The doubling time 5 days ago was{" "}
  //           <strong>{analysis.doublingTimeM5.toFixed(2)} days</strong>. The
  //           doubling time is{" "}
  //           {analysis.doublingTime > analysis.doublingTimeM5
  //             ? "is increasing, which is encouraging!"
  //             : "is decreasing, which is worrisome."}
  //         </p>
  //         {region === "US" ? (
  //           <>
  //             <p>
  //               The United States will reach 1% infection on{" "}
  //               <strong>{dateOf1.toDateString()}</strong> if unabated
  //               exponential growth continues.
  //             </p>
  //             <p>
  //               Unabated, we will run out of hospital beds on{" "}
  //               <strong>{dateOfNoBeds.toDateString()}</strong> assuming a 12%
  //               hospitalization rate.
  //             </p>
  //             <p>
  //               The United States will reach 100% infection on{" "}
  //               <strong>{dateOf100.toDateString()}</strong> if unabated
  //               exponential growth continues.
  //             </p>
  //           </>
  //         ) : null}
  //         <p>
  //           It's important to understand that confirmed cases lag new infections
  //           by about 5 days (the incubation period), so this is a trailing
  //           indicator that tells us how well we were controlling the spread a
  //           week ago.
  //         </p>
  //         <br />
  //         <br />
  //         <div>
  //           References:
  //           <ul>
  //             <li>
  //               Data Source:{" "}
  //               <a href="https://covidtracking.com/">
  //                 https://covidtracking.com/
  //               </a>
  //             </li>
  //             <li>
  //               COVID-19 median incubation period:{" "}
  //               <a href="https://www.sciencedaily.com/releases/2020/03/200317175438.htm">
  //                 https://www.sciencedaily.com/releases/2020/03/200317175438.htm
  //               </a>
  //             </li>
  //             {region === "US" ? (
  //               <>
  //                 <li>
  //                   Number of Hospital Beds in the United States:{" "}
  //                   <a href="https://www.aha.org/statistics/fast-facts-us-hospitals">
  //                     https://www.aha.org/statistics/fast-facts-us-hospitals
  //                   </a>
  //                 </li>
  //                 <li>
  //                   Hospitalization rates of COVID-19 in the United States:{" "}
  //                   <a href="https://www.cdc.gov/mmwr/volumes/69/wr/mm6912e2.htm">
  //                     https://www.cdc.gov/mmwr/volumes/69/wr/mm6912e2.htm
  //                   </a>
  //                 </li>
  //                 <li>
  //                   Number of Hospital Beds in the United States:{" "}
  //                   <a href="https://www.aha.org/statistics/fast-facts-us-hospitals">
  //                     https://www.aha.org/statistics/fast-facts-us-hospitals
  //                   </a>
  //                 </li>
  //                 <li>
  //                   United States Population:{" "}
  //                   <a href="https://www.worldometers.info/world-population/us-population/">
  //                     https://www.worldometers.info/world-population/us-population/
  //                   </a>
  //                 </li>
  //               </>
  //             ) : null}
  //             <li>
  //               Exponential Growth:{" "}
  //               <a href="https://en.wikipedia.org/wiki/Exponential_growth">
  //                 https://en.wikipedia.org/wiki/Exponential_growth
  //               </a>
  //             </li>
  //           </ul>
  //         </div>
  //         <br />
  //         <br />
  //         <div style={{ textAlign: "center", fontStyle: "italic" }}>
  //           Created by{" "}
  //           <a href="https://twitter.com/alexsauerbudge">alexsauerbudge</a>.
  //           <br />
  //           Provided "as is" with all faults and no guarantee of accuracy,
  //           correctness, or fitness for any purpose.
  //         </div>
  //         {/* {series.map((total, index) => (
  //         <div key={index}>
  //           {indexes[index]}, {total}
  //         </div>
  //       ))} */}
  //       </div>
  //     </div>
  //   )
  // } else {
  //   return <div>Loading...</div>
  // }

  // return (
  //   <div>
  //     <pre>{JSON.stringify(data || {}, null, 2)}</pre>
  //   </div>
  // )

  if (data) {
    return (
      <div>
        <Typography variant="h4" align="center">
          US COVID-19 Tracker
        </Typography>
        <Typography
          align="center"
          style={{ marginBottom: "2em", color: "#555" }}
        >
          as of {parseDate(data["US"][0].date).toDateString()}
        </Typography>
        <Container maxWidth="md" style={{ marginBottom: "4em" }}>
          <Paper elevation={0}>
            <DetailView data={data["US"]} />
          </Paper>
        </Container>
        <Container maxWidth="md" style={{ marginTop: "1em" }}>
          <Paper elevation={1}>
            {Object.keys(data)
              .filter(key => key !== "US" && stateNames[key])
              .map(stateCode => (
                <StatePanel
                  key={stateCode}
                  stateCode={stateCode}
                  data={data[stateCode]}
                />
              ))}
          </Paper>
        </Container>
        <div
          style={{
            textAlign: "center",
            fontStyle: "italic",
            marginTop: "5em",
            color: "#888"
          }}
        >
          Created by{" "}
          <a href="https://twitter.com/alexsauerbudge">alexsauerbudge</a>.
          <br />
          Data from{" "}
          <a href="https://covidtracking.com/">https://covidtracking.com/</a>
          <br />
          Provided "as is" with all faults and no guarantee of accuracy,
          correctness, or fitness for any purpose.
        </div>
      </div>
    )
  } else {
    return <CircularProgress />
  }
}

function StatePanel({ stateCode, data }) {
  const positives = data.map(obs => obs.positive || 0).reverse()
  const hospitalizations = data.map(obs => obs.hospitalized || 0).reverse()
  const percentChangeInGrowthRate =
    100 *
    ((4 * (data[0].positive - data[1].positive)) /
      (data[1].positive - data[4].positive) -
      1)
  const changeInGrowthRateAngle = Math.min(
    Math.max(-percentChangeInGrowthRate - 45, -90),
    0
  )
  return (
    <ExpansionPanel TransitionProps={{ unmountOnExit: true }}>
      <ExpansionPanelSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${stateCode}-content`}
        id={`${stateCode}-header`}
      >
        <Grid container spacing={0}>
          <Grid item xs={2}>
            <Typography style={{ fontWeight: "500" }}>
              {stateNames[stateCode]}
            </Typography>
          </Grid>
          <Grid item xs={1}>
            {/* {percentChangeInGrowthRate.toFixed(0)}% */}
            <ArrowForwardIcon
              style={{
                color: percentChangeInGrowthRate > 0 ? "#c21807" : "green",
                transform: `rotate(${changeInGrowthRateAngle.toFixed(0)}deg)`
              }}
            />
          </Grid>
          <Grid item xs={2}>
            <Sparklines data={positives} style={{ height: "2em" }}>
              <SparklinesBars style={{ fill: "#c21807" }} />
            </Sparklines>
          </Grid>
          <Grid item xs={1} style={{ textAlign: "right" }}>
            <Typography>{positives[positives.length - 1]}</Typography>
            <br />
            <Typography
              style={{
                color: "#aaa",
                fontSize: "x-small",
                marginTop: "-2em"
              }}
            >
              POSITIVES
            </Typography>
          </Grid>
          <Grid item xs={1}></Grid>
          {hospitalizations[hospitalizations.length - 1] ? (
            <>
              <Grid item xs={2}>
                <Sparklines data={hospitalizations} style={{ height: "2em" }}>
                  <SparklinesBars style={{ fill: "#c21807" }} />
                </Sparklines>
              </Grid>
              <Grid item xs={2} style={{ textAlign: "right" }}>
                <Typography>
                  {hospitalizations[hospitalizations.length - 1]}
                </Typography>
                <br />
                <Typography
                  style={{
                    color: "#aaa",
                    fontSize: "x-small",
                    marginTop: "-2em"
                  }}
                >
                  HOSPITALIZATIONS
                </Typography>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={4} style={{ textAlign: "center" }}>
                <Typography
                  style={{
                    color: "#ddd",
                    fontSize: "x-small",
                    marginTop: "1.25em"
                  }}
                >
                  NOT AVAILABLE
                </Typography>
              </Grid>
            </>
          )}
          {/* <Grid item xs={2}>
            <Sparklines data={data.map(obs => obs.death).reverse()}  style={{ height: "2em" }}>
              <SparklinesBars style={{ fill: "#41c3f9" }} />
            </Sparklines>
          </Grid>
          <Grid item xs={1} style={{ textAlign: "right" }}>
            <Typography>{data[0]["death"]}</Typography>
            <br />
            <Typography
              style={{
                color: "#aaa",
                fontSize: "x-small",
                marginTop: "-2em"
              }}
            >
              DEATH
            </Typography>
          </Grid> */}
        </Grid>
        {/* <Typography style={{ width: "12em" }} gutterBottom>
          {stateNames[stateCode]}
        </Typography>
        <Typography style={{ width: "5em", marginRight: "1em" }} gutterBottom>
          <Sparklines data={data.map(obs => obs.positive).reverse()}>
            <SparklinesBars style={{ fill: "#41c3f9" }} />
          </Sparklines>
        </Typography>
        <Typography style={{ width: "5em", textAlign: "right" }} gutterBottom>{data[0]["positive"]}</Typography>
        <Typography style={{ marginLeft: "0.2em", color: "#aaa", fontSize: "x-small" }} gutterBottom>
          POSITIVES
        </Typography> */}
      </ExpansionPanelSummary>
      <ExpansionPanelDetails>
        <DetailView data={data} />
      </ExpansionPanelDetails>
    </ExpansionPanel>
  )
}

function DetailView({ data }) {
  const dates = data.map(obs => parseDate(obs.date)).reverse()
  return (
    <Grid container justify="center" alignItems="center" spacing={2}>
      {/* <Grid item xs={3}></Grid> */}
      <Grid item xs={12}>
        <Analysis
          title="Positives"
          series={data.map(obs => obs.positive).reverse()}
          dates={dates}
          width={870}
        />
      </Grid>
      {/* <Grid item xs={3}></Grid> */}
      <Grid item xs={6}>
        <Analysis
          title="Hospitalizations"
          series={data.map(obs => obs.hospitalized).reverse()}
          dates={dates}
        />
      </Grid>
      <Grid item xs={6}>
        <Analysis
          title="Deaths"
          series={data.map(obs => obs.death).reverse()}
          dates={dates}
        />
      </Grid>
    </Grid>
  )
}

function Statistic({ value, label }) {
  return (
    <>
      {value}
      <br />
      <Typography
        style={{
          color: "#aaa",
          fontSize: "x-small"
        }}
      >
        {label}
      </Typography>
    </>
  )
}

function Analysis({ title, series, dates, width = 400 }) {
  const analysis = analyzeSeries(series, dates)
  if (analysis) {
    return (
      <Grid container justify="center" alignItems="center" spacing={1}>
        <Grid item xs={12}>
          <Typography
            variant="h6"
            align="center"
            style={{ textTransform: "uppercase" }}
          >
            {title}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              width: `${width}px`,
              height: "200px",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            <ResponsiveContainer width="100%">
              <ComposedChart data={analysis.chartData}>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="timeIndex"
                  // name={`days since ${analysis.baseDate.toDateString()}`}
                  domain={["dataMin", "dataMax"]}
                  unit=""
                />
                {/* <YAxis
                type="number"
                dataKey="value"
                // name={`number ${variable}s`}
                unit=""
              /> */}
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Line
                  name={
                    <span>
                      ~2<sup>t/{analysis.doublingTime.toFixed(2)}</sup>
                    </span>
                  }
                  dataKey="fit"
                  stroke="#555"
                  strokeWidth={3}
                  dot={false}
                />
                <Line dataKey="value" stroke="#c21807" dot={false} />
                <Scatter name={title} dataKey="value" fill="#c21807" />
                {/* <Legend verticalAlign="top" height={36} /> */}
              </ComposedChart>
            </ResponsiveContainer>
            {/* <div style={{ fontSize: "smaller", fontStyle: "italic" }}>
              days since first reported {variable}
              <br />({analysis.baseDate.toDateString()})
            </div> */}
          </div>
        </Grid>
        {width <= 400 ? <Grid item xs={1}></Grid> : null}
        <Grid item xs={width <= 400 ? 2 : 3} style={{ textAlign: "left" }}>
          <Statistic
            value={shortDateString(analysis.chartData[0].date)}
            label="DAYS SINCE"
          />
        </Grid>
        <Grid item xs={2} style={{ textAlign: "center" }}>
          <Statistic
            value={(100 * analysis.rSquared).toFixed(0) + "%"}
            label="EXPONENTIAL"
          />
        </Grid>
        <Grid item xs={3} style={{ textAlign: "right" }}>
          <Statistic
            value={analysis.doublingTime.toFixed(2) + " days"}
            label="DOUBLING TIME"
          />
        </Grid>
        <Grid item xs={3} style={{ textAlign: "right" }}>
          <Statistic value={series[series.length - 1]} label="TOTAL" />
        </Grid>
        {width <= 400 ? <Grid item xs={1}></Grid> : null}
      </Grid>
    )
  } else {
    return (
      <Grid container justify="center" alignItems="center" spacing={1}>
        <Grid item xs={12}>
          <Typography
            variant="h6"
            align="center"
            style={{ textTransform: "uppercase" }}
          >
            {title}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              width: `${width}px`,
              height: "200px",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            <Typography
              style={{
                color: "#ddd",
                textAlign: "center",
                marginTop: "3.70em"
              }}
            >
              NOT AVAILABLE
            </Typography>
          </div>
        </Grid>
      </Grid>
    )
  }
}
