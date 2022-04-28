import React, { useEffect, useState } from "react";
import PhotoContextProvider from "./context/PhotoContext";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import Header from "./components/Header";
import Item from "./components/Item";
import Search from "./components/Search";
import NotFound from "./components/NotFound";

import { useSpeechContext } from "@speechly/react-client";
import {
  IntroPopup,
  PushToTalkButton,
  BigTranscript,
} from "@speechly/react-ui";
import magenta from "./magenta";
import genie from "./genie";

export default function App() {
  const { segment } = useSpeechContext();

  const [agentState, setAgent] = useState("");
  useEffect(() => {
    if (agentState) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${agentState} activated.`));
  }, [agentState]);

  useEffect(() => {
    if (segment) {
      const plainString = segment.words.filter(w => w.value).map(w => w.value).join(' ');
      console.log(plainString);
      if (segment.isFinal) {
        console.log("✅", plainString);
        console.log(segment);

        const [agent] = segment.entities.filter(m => m.type === "agent").map(m => m.value);
        switch (segment.intent?.isFinal && segment.intent.intent) {
          case "LaunchIntent":
            setAgent(agent);
            break;
          case "StopIntent":
            setAgent("");
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${agentState} terminated.`));
            break;
          case agent && "AskIntent":
            const [utterance] = segment.entities.filter(m => m.type === "utterance").map(m => m.value);
            (agent === "magenta" ? magenta : genie).send_text(utterance ? utterance : plainString).then((r) => {
              console.log(r);
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(r.text));
            });
            break;
          default:
            (agentState === "magenta" ? magenta : genie).send_text(plainString).then((r) => {
              console.log(r);
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(r.text));
            });
        }
      }
    }
  }, [segment]);

  // Prevent page reload, clear input, set URL and push history on submit
  const handleSubmit = (e, history, searchInput) => {
    e.preventDefault();
    e.currentTarget.reset();
    let url = `/search/${searchInput}`;
    history.push(url);
  };

  return (
      <PhotoContextProvider>
        <IntroPopup />
        <BigTranscript placement="top"/>
        <PushToTalkButton placement="bottom" captureKey=" " powerOn="auto" />
        <HashRouter basename="/SnapScout">
          <div className="container">
            <Route
                render={props => (
                    <Header
                        handleSubmit={handleSubmit}
                        history={props.history}
                    />
                )}
            />
            <Switch>
              <Route
                  exact
                  path="/"
                  render={() => <Redirect to="/mountain" />}
              />

              <Route
                  path="/mountain"
                  render={() => <Item searchTerm="mountain" />}
              />
              <Route path="/beach" render={() => <Item searchTerm="beach" />} />
              <Route path="/bird" render={() => <Item searchTerm="bird" />} />
              <Route path="/food" render={() => <Item searchTerm="food" />} />
              <Route
                  path="/search/:searchInput"
                  render={props => (
                      <Search searchTerm={props.match.params.searchInput} />
                  )}
              />
              <Route component={NotFound} />
            </Switch>
          </div>
        </HashRouter>
      </PhotoContextProvider>
  );
}
