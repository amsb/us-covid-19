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
// import ArrowForwardIcon from "@material-ui/icons/ArrowForward"

import { Sparklines, SparklinesBars } from "react-sparklines"

// import { regressionExp } from "d3-regression"
import {
  ResponsiveContainer,
  ComposedChart,
  // Scatter,
  // Line,
  Bar,
  XAxis,
  // YAxis,
  CartesianGrid,
  // Legend,
  Tooltip,
} from "recharts"

import stateNames from "./stateNames.json"
import "./styles.css"

function groupBy(xs, key) {
  return xs.reduce(function (rv, x) {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
}

function shortDateString(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function analyzeSeries(series, dates) {
  const data = series.map((value, timeIndex) => ({
    value,
    timeIndex,
  }))
  // .filter(
  //   (obs, index) =>
  //     // obs.value &&
  //     // obs.value > 0 &&
  //     // (index === 0 || obs.value !== series[index - 1])
  // )
  if (data.length >= 5) {
    // const regression = regressionExp()
    //   .x((obs) => obs.timeIndex)
    //   .y((obs) => obs.value)(data)
    // const doublingTime = Math.log(2) / regression.b
    // const c0 = regression.a
    // const daysUntil = (n) =>
    //   Math.ceil(
    //     (doublingTime * Math.log(n / c0)) / Math.log(2) -
    //       data[data.length - 1].timeIndex
    //   )
    // const rSquared = regression.rSquared

    const chartData = data.map((obs, index) => {
      return {
        ...obs,
        // change: index > 1 ? obs.value - data[index - 1].value : 0,
        date: dates[obs.timeIndex],
        // fit: c0 * Math.pow(2, obs.timeIndex / doublingTime),
      }
    })

    // chartData.forEach((obs, index) => {
    //   obs.changeFit = index > 1 ? obs.fit - chartData[index - 1].fit : 0
    // })

    return {
      // rSquared,
      // doublingTime,
      // daysUntil,
      chartData,
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

      // clean-up data a bit
      Object.keys(data).forEach((regionCode) => {
        const regionData = data[regionCode]
        regionData.reverse().forEach((obs, index, array) => {
          if (index > 0) {
            obs.positive = Math.max(
              obs.positive,
              array[index - 1].positive || 0
            )
            obs.positiveIncrease = obs.positive - array[index - 1].positive
            obs.hospitalized = Math.max(
              obs.hospitalized,
              array[index - 1].hospitalized || 0
            )
            obs.hospitalizedIncrease =
              obs.hospitalized - array[index - 1].hospitalized
            obs.death = Math.max(obs.death, array[index - 1].death || 0)
            obs.deathIncrease = obs.death - array[index - 1].death
          }
        })
        data[regionCode] = data[regionCode].filter(
          (obs, index) => obs.positiveIncrease && obs.positiveIncrease > 0
        )
      })

      setData(data)
    }
    fetchData()
  }, [setData])

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
          as of{" "}
          {parseDate(data["US"][data["US"].length - 1].date).toDateString()}
        </Typography>
        <Container maxWidth="md" style={{ marginBottom: "4em" }}>
          <Paper elevation={0}>
            <DetailView data={data["US"]} />
          </Paper>
        </Container>
        <Container maxWidth="md" style={{ marginTop: "1em" }}>
          <Paper elevation={1}>
            {Object.keys(data)
              .filter((key) => key !== "US" && stateNames[key])
              .map((stateCode) => (
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
            color: "#888",
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
  const positives = data.map((obs) => obs.positiveIncrease || 0)
  // const hospitalizations = data.map((obs) => obs.hospitalizedIncrease || 0)
  const deaths = data.map((obs) => obs.deathIncrease || 0)
  // const percentChangeInGrowthRate =
  //   100 *
  //   ((4 * (data[0].positive - data[1].positive)) /
  //     (data[1].positive - data[4].positive) -
  //     1)
  // const changeInGrowthRateAngle = Math.min(
  //   Math.max(-percentChangeInGrowthRate - 45, -90),
  //   0
  // )
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
            <Typography
              style={{ fontWeight: "100", fontSize: "smaller", color: "#777" }}
            >
              as of {shortDateString(parseDate(data[data.length - 1].date))}
            </Typography>
          </Grid>
          {/* <Grid item xs={1}> */}
          {/* {percentChangeInGrowthRate.toFixed(0)}% */}
          {/* <ArrowForwardIcon
              style={{
                color: percentChangeInGrowthRate > 0 ? "#c21807" : "green",
                transform: `rotate(${changeInGrowthRateAngle.toFixed(0)}deg)`,
              }}
            /> */}
          {/* </Grid> */}
          <Grid item xs={2}>
            <Sparklines data={positives} style={{ height: "2em" }}>
              <SparklinesBars style={{ fill: "#c21807" }} />
            </Sparklines>
          </Grid>
          <Grid item xs={2} style={{ textAlign: "right" }}>
            <Typography>
              {positives[positives.length - 1].toLocaleString()}
            </Typography>
            <br />
            <Typography
              style={{
                color: "#aaa",
                fontSize: "x-small",
                marginTop: "-2em",
              }}
            >
              NEW POSITIVES
            </Typography>
          </Grid>
          <Grid item xs={1}></Grid>
          {deaths[deaths.length - 1] ? (
            <>
              <Grid item xs={2}>
                <Sparklines data={deaths} style={{ height: "2em" }}>
                  <SparklinesBars style={{ fill: "#c21807" }} />
                </Sparklines>
              </Grid>
              <Grid item xs={2} style={{ textAlign: "right" }}>
                <Typography>
                  {deaths[deaths.length - 1].toLocaleString()}
                </Typography>
                <br />
                <Typography
                  style={{
                    color: "#aaa",
                    fontSize: "x-small",
                    marginTop: "-2em",
                  }}
                >
                  NEW DEATHS
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
                    marginTop: "1.25em",
                  }}
                >
                  NOT AVAILABLE
                </Typography>
              </Grid>
            </>
          )}
          {/* <Grid item xs={2}>
            <Sparklines data={data.map(obs => obs.death)}  style={{ height: "2em" }}>
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
          <Sparklines data={data.map(obs => obs.positive)}>
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
  const dates = data.map((obs) => parseDate(obs.date))
  return (
    <Grid container justify="center" alignItems="center" spacing={2}>
      {/* <Grid item xs={3}></Grid> */}
      <Grid item xs={12}>
        <Analysis
          title="Positives"
          series={data.map((obs) => obs.positiveIncrease)}
          dates={dates}
          width={870}
        />
      </Grid>
      {/* <Grid item xs={3}></Grid> */}
      <Grid item xs={6}>
        <Analysis
          title="Hospitalizations"
          series={data.map((obs) => obs.hospitalizedIncrease || 0)}
          dates={dates}
        />
      </Grid>
      <Grid item xs={6}>
        <Analysis
          title="Deaths"
          series={data.map((obs) => obs.deathIncrease)}
          dates={dates}
        />
      </Grid>
    </Grid>
  )
}

function Statistic({ value, label }) {
  return (
    <>
      {value.toLocaleString()}
      <br />
      <Typography
        style={{
          color: "#aaa",
          fontSize: "x-small",
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
            Daily {title}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              width: `${width}px`,
              height: "200px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <ResponsiveContainer width="100%">
              <ComposedChart data={analysis.chartData}>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="timeIndex"
                  // formatter={(value, name, props) => [value.toLocaleString(), title]}
                  // label={`days since ${shortDateString(analysis.chartData[0].date)}`}
                  domain={["dataMin", "dataMax"]}
                  unit=""
                />
                {/* <YAxis
                type="number"
                dataKey="value"
                // name={`number ${variable}s`}
                unit=""
              /> */}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name, props) => [
                    value.toLocaleString(),
                    title,
                  ]}
                />
                {/* <Line
                  name={
                    <span>
                      ~2<sup>t/{analysis.doublingTime.toFixed(2)}</sup>
                    </span>
                  }
                  dataKey="changeFit"
                  stroke="#555"
                  strokeWidth={3}
                  dot={false}
                /> */}
                <Bar dataKey="value" fill="#c21807" dot={false} />
                {/* <Scatter name={title} dataKey="value" fill="#c21807" /> */}
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
          {/* <Statistic
            value={(100 * analysis.rSquared).toFixed(0) + "%"}
            label="EXPONENTIAL"
          /> */}
        </Grid>
        <Grid item xs={3} style={{ textAlign: "right" }}>
          {/* <Statistic
            value={analysis.doublingTime.toFixed(2) + " days"}
            label="DOUBLING TIME"
          /> */}
        </Grid>
        <Grid item xs={3} style={{ textAlign: "right" }}>
          <Statistic
            value={series[series.length - 1]}
            label={`REPORTED ON ${shortDateString(
              analysis.chartData[analysis.chartData.length - 1].date
            )}`}
          />
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
              marginRight: "auto",
            }}
          >
            <Typography
              style={{
                color: "#ddd",
                textAlign: "center",
                marginTop: "3.70em",
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
