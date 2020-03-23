import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { regressionExp } from "d3-regression";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip
} from "recharts";

import stateNames from "./stateNames.json";
import "./styles.css";

const states = {};
stateNames.forEach(name => (states[name] = true));

export default function App() {
  const [state, setState] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"
      );
      const csv = await response.text();
      const rawData = Papa.parse(csv).data;

      let data = null;
      rawData.forEach(row => {
        if (row[1] === "US" && states[row[0]] != null) {
          const stateData = row.slice(4).map(s => parseInt(s, 10));
          if (data === null) {
            data = stateData.map((c, t) => ({
              t,
              c: c,
              date: new Date(rawData[0].slice(4)[t])
            }));
          } else {
            stateData.forEach((c, t) => {
              data[t].c += c;
            });
          }
        }
      });

      const baseDate = data[0].date;

      let offset = null;
      data.forEach((point, t) => {
        if (offset === null && point.c > 0) {
          offset = t;
        }
      });
      data = data.slice(offset);

      const regression = regressionExp()
        .x(d => d.t)
        .y(d => d.c)(data);

      const c0 = regression.a;
      const doublingTime = Math.log(2) / regression.b;
      const daysUntil = n =>
        Math.ceil(
          (doublingTime * Math.log(n / c0)) / Math.log(2) -
            data[data.length - 1].t
        );

      data.forEach(({ t }, index) => {
        data[index].cFit = c0 * Math.pow(2, t / doublingTime);
      });

      setState({
        baseDate,
        data: data,
        rSquared: regression.rSquared,
        daysUntil,
        doublingTime,
        c0
      });
    }
    if (state == null) {
      fetchData();
    }
  }, [state]);

  if (state) {
    const asOfDate = new Date(state.data[state.data.length - 1].date);

    const daysUntil100 = state.daysUntil(331e6);
    let dateOf100 = new Date(Number(asOfDate));
    dateOf100.setDate(asOfDate.getDate() + daysUntil100);

    const daysUntil1 = state.daysUntil(331e6 / 100);
    let dateOf1 = new Date(Number(asOfDate));
    dateOf1.setDate(asOfDate.getDate() + daysUntil1);

    const daysUntilNoBeds = state.daysUntil(924107 / 0.12);
    let dateOfNoBeds = new Date(Number(asOfDate));
    dateOfNoBeds.setDate(asOfDate.getDate() + daysUntilNoBeds);

    let status = "No.";
    if (state.rSquared < 0.8) {
      status = "Yes!?";
    } else if (state.rSquared < 0.9) {
      status = "Maybe!?";
    }

    return (
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
          <h2>Have We Flattened the COVID-19 Curve in the United States?</h2>
          {/* <h2 style={{ color: "red" }}>{status}</h2> */}
          <p>As of {asOfDate.toDateString()}</p>
          <ComposedChart data={state.data} width={400} height={400}>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="t"
              name={`Days Since ${state.baseDate.toDateString()}`}
              unit=""
            />
            <YAxis
              type="number"
              dataKey="c"
              name="Number of Confirmed COVID-19 Cases"
              unit=""
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Confirmed Cases" dataKey="c" fill="black" />
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
          <div
            style={{ fontSize: "smaller", fontStyle: "italic" }}
          >{`Days Since ${state.baseDate.toDateString()}`}</div>
        </div>
        <br />
        <p>
          The growth rate of the number of new COVID-19 cases in the United
          States has a <strong>{(100 * state.rSquared).toFixed(0)}%</strong> fit
          to exponential growth and appears to be doubling every{" "}
          <strong>{state.doublingTime.toFixed(2)} days</strong>.
        </p>
        <p>
          The United States will reach 1% infection on{" "}
          <strong>{dateOf1.toDateString()}</strong> if unabated exponential
          growth continues. The upper limit on what China believes were
          infected.
        </p>
        <p>
          Unabated, we will run out of hospital beds on{" "}
          <strong>{dateOfNoBeds.toDateString()}</strong> assuming a 12%
          hospitalization rate.
        </p>
        <p>
          The United States will reach 100% infection on{" "}
          <strong>{dateOf100.toDateString()}</strong> if unabated exponential
          growth continues.
        </p>
        <p>
          It's important to understand that confirmed cases lag new infections
          by about 5 days (the incubation period), so this is a trailing
          indicator that tells us how well we were controlling the spread a week
          ago.
        </p>
        <br />
        <br />
        <div>
          References:
          <ul>
            <li>
              Confirmed COVID-19 cases in the United States:{" "}
              <a href="https://github.com/CSSEGISandData/COVID-19">
                https://github.com/CSSEGISandData/COVID-19
              </a>
            </li>
            <li>
              COVID-19 median incubation period:{" "}
              <a href="https://www.sciencedaily.com/releases/2020/03/200317175438.htm">
                https://www.sciencedaily.com/releases/2020/03/200317175438.htm
              </a>
            </li>
            <li>
              Percentage of Population Infected in China:{" "}
              <a href="https://www.bloomberg.com/news/articles/2020-03-18/as-china-virus-cases-near-zero-experts-warn-of-second-wave">
                https://www.bloomberg.com/news/articles/2020-03-18/as-china-virus-cases-near-zero-experts-warn-of-second-wave
              </a>
            </li>
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
          Provided "as is" with all faults and no guarantee of accuracy,
          correctness, or fitness for any purpose.
        </div>
        {/* {series.map((total, index) => (
          <div key={index}>
            {indexes[index]}, {total}
          </div>
        ))} */}
      </div>
    );
  } else {
    return <div>Loading...</div>;
  }
}
