import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import ScrollSidebar from "../components/Common/ScrollSidebar/scrollSidebar.js";
import TutorialStyles from "./tutorial.module.css";
import Slide from '../components/Common/Slide/slide.js';
import PageImage from "../components/Common/PageImage/pageImage.js";

function Tutorial() {
  const [images, setImages] = useState([]);
  const [DiscoverySlides, setDiscoverySlides] = useState([]);
  const [AggregateSlides, setAggregateSlides] = useState([]);
  const [IntegrationSlides, setIntegrationSlides] = useState([]);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);


  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 4; i++) {
      const image = require(`../resources/images/tutorial/slide1/${i}.jpg`);
      slideImages.push(image);
    }
    setDiscoverySlides(slideImages);
  }, []);


  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 4; i++) {
      const image = require(`../resources/images/tutorial/slide2/${i}.jpg`);
      slideImages.push(image);
    }
    setAggregateSlides(slideImages);
  }, []);

  useEffect(() => {
    const slideImages = [];
    for (let i = 1; i <= 4; i++) {
      const image = require(`../resources/images/tutorial/slide2/${i}.jpg`);
      slideImages.push(image);
    }
    setIntegrationSlides(slideImages);
  }, []);

  const DiscoverySteps = [
    'Overall Discovery view.',
    'Feature tables containing statistics.',
    'Graph representations of each feature.',
    'Side bar hosting most of the page controls.'
  ];

  const AggregateSteps = [
    'Aggregate statistics display',
    'Aggregate statistics table',
    'Chi-Squared test results.',
    'List of ommited features in the calculations.',
    'Side bar hosting most of the page controls.'
  ];

  const IntegrationSteps = [
    'Aggregate statistics display',
    'Aggregate statistics table',
    'Chi-Squared test results.',
    'List of ommited features in the calculations.',
    'Side bar hosting most of the page controls.'
  ];

  useEffect(() => {
    const ctx = require.context("../resources/images/tutorial", false, /\.(png|jpe?g|svg|gif)$/);
    const imgs = ctx.keys().sort().map(ctx);
    setImages(imgs);
  }, []);

  const sections = useMemo(() => [
    'Introduction',
    'Navigating-the-tool',
    'Selecting-files',
    'Discovery',
    'Discovery:-individual-metrics',
    'Discovery:-aggregate-metrics',
    'Integration',
    'Integration:-updating-files',
    'Creating-and-Filtering-variables',
    'Unions',
    'Variables/Biological-entities',
    'Guided-Use-case',
  ], []);
  const [selectedRange, setSelectedRange] = useState();
  return (
    <div className={TutorialStyles.pageContainer}>
      <aside className={TutorialStyles.sidebar}>
        <ScrollSidebar sections={sections} offset={55} />
      </aside>
      <div id="Introduction" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textContainer}>
          <h2 className={TutorialStyles.centeredHeading}>Introduction</h2>
          <div className={TutorialStyles.introText}>
            <p>
              The <em>MEDIATA</em> platform has been developed to prepare distributed
              clinical tabular data for machine learning (ML) through discovery,
              preprocessing and integration, semantic alignment to ontologies, and
              HL7 FHIR standardization. The goal is to achieve harmonized, standardized
              datasets and/or mappings ready for federated training.
            </p>
            <p>
              This tutorial serves as a guide for users in an already established
              and deployed project. To participate and use the tool within your project,
              please contact the{" "}
              <a
                href="https://semantics.inf.um.es/mediata/#/about"
                target="_blank"
                rel="noopener noreferrer"
              >
                development team
              </a>.
            </p>
          </div>

        </div>
      </div>
      <div id="Navigating-the-tool" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Navigating the tool</h2>
            <div className={TutorialStyles.introText}>
              <p>
                Once the tool has been deployed in at least one participating institution,
                its datasets will be available for use. To access the platform, log in with your credentials.
                Click the <strong> Login</strong> button at the top-right, in the navigation bar, and
                enter the credentials provided by the development team.
              </p>
              <p>
                After logging in, you'll be redirected to the node view. Here, all
                institutions participating in the harmonization pipeline are listed.
                You can select an institution by double-clicking it. Alternatively,
                you can choose to work with multiple institutions at the same time:
                drag each node of interest next to the others and click the <em>Join nodes </em>
                control that will show between them.
              </p>
              <PageImage
                imageSrc={require("../resources/images/tutorial/1_nodes.gif")}
                maintainAspectRatio={true}
                alt="Dragging nodes and joining them"
              />
              <p>
                Clicking a node (or a group of nodes) displays the DCAT descriptions
                configured to describe the datasets within it. If multiple nodes are opened
                at once, each of them will have its own collapsible tab. Expanding it will display
                these description for the corresponding node.
              </p>
              <br />
              <p>
                While DCAT descriptions are public, operating within a node (i.e., accessing
                and acting within the institution it represents) requires the appropriate
                site-specific permissions. If you don't have these permissions, please contact
                the team that deployed the tool.
              </p>
            </div>
            <div className={TutorialStyles.introText}>
              <p>
                Inside a node, you can access the tool's different functionalities. New options
                will appear in the top menu bar. You can also return to the nodes tab to select
                different institutions. A highlight indicates your current section. Clicking the
                section you're already in will reload that page.
              </p>
              <PageImage
                imageSrc={require("../resources/images/tutorial/2_navbar.gif")}
                maintainAspectRatio={true}
                alt="Top navigation bar showing the available sections"
              />
            </div>
          </div>
        </div>
      </div>
      <div id="Selecting-files" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textContainer}>
          <h2 className={TutorialStyles.centeredHeading}>Selecting files</h2>
          <span className={TutorialStyles.introText}>
            When accessing most of the sections of the tool, the user will be presented with a list of files.
            These list change from between each section: as detailed on each views description here, the Discovery
            view selects both the raw datasets and the integrated files generated in the Integration view. Integration
            allows you to select the metadata files that detail the features presents in datasets in the nodes.
            Semantic alignment allows you to upload a file describing the elements of interest to be aligned to ontologies.
            The same happens in the HL7 FHIR view. In both of these, the file exported from the Integration view can be used
            as an entrypoint.
            Files may take some time to load, depending on their size and the number of files present in the institution.
            <br />
            <br />
            <p>
              <em>Note:</em> To return to file selection in any view, click its name in the
              top menu bar or reload the page.
            </p>
          </span>
        </div>
      </div>
      <div id="Discovery" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery</h2>
            <span className={TutorialStyles.introText}>
              <em>Discovery</em> is the section where you will be first redirected after accessing a node.
              This section displays all the dataset related statistics, displaying both insights related
              to each feature from the selected datasets individually and aggregated. Initially, in the individual
              features, loaded by default,  you can recognize three areas: the feature tables, the graphs and the sidebar.
              This sidebar is also present in the aggregate view, and holds most controls.
              <Slide images={DiscoverySlides} steps={DiscoverySteps} />
              <br />
              <br />
              The sidebar contains the following controls:
              <ul className={TutorialStyles.bulletList}>
                <li>
                  <b>Selected feature & type switch</b>: shows the currently selected feature and lets you
                  switch its type from categorical to continuous or vice versa. This recalculates statistics
                  for that feature, and changes it's graph display.
                </li>
                <li>
                  <b>File selector</b>: when multiple files are loaded, toggle which files' data should
                  contribute to the view. Files are grouped by node.
                </li>
                <li>
                  <b>Feature toggles</b>: per-feature switches to include or hide features from the tables,
                  charts and exports. You can search for features by name or choose to show or hide all.
                </li>
                <li>
                  <b>Outliers switch</b>: show or hide outliers detected for each feature in their charts.
                </li>
                <li>
                  <b>View switch</b>: switch between individual metrics and aggregate metrics.
                </li>
                <li>
                  <b>Filters</b>: open the filter panel to add or edit feature specific filters. Multiple filters
                  can be added at once to multiple features and files. To add more than one, declare the filter and
                  click the 'Add more criteria' button'. Once all filters are added, click 'Apply filters' to apply them.
                  To clear all filters, click the "Reset previous filters" button that appears when filters are present.
                </li>
                <li>
                  <b>Integrity metrics</b>: opens a modal with a per-file summary of data integrity. It shows the row count
                  and only the features with issues, including missing-value rates and outlier counts to indicate severity.
                </li>
                <li>
                  <b>Export data</b> exports and downloads the calculated insights from the individual metrics tables.
                </li>
                <li>
                  <b>Upload elements</b>: saves the configured metadata to the site so that it can be selected for <em>Integration</em>.
                  Clicking the green arrow button will both upload the metadata and navigate to the Integration view, selecting the produced
                  file.
                </li>
              </ul>
            </span>
          </div>
        </div>
      </div>

      <div id="Discovery:-individual-metrics" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery: Individual metrics</h2>
            <span className={TutorialStyles.introText}>
              The initial <em>Discovery</em> view displays insights related to individual features.
              The upper half of the view contains two tables: one for continuous features and one for categorical features.
              Each table lists one row per feature. The table columns are resizable. To change their size, hover to reveal the
              divider and drag it. See the tables below for the metrics included for each type.
              <br />
              <br />
              <b> Statistics present for continuous features:</b>
              <table className={TutorialStyles.variablesTable}>
                <tbody>
                  <tr><td>count</td><td>number of non-missing values detected for the feature.</td></tr>
                  <tr><td>mean</td><td>arithmetic average of the values.</td></tr>
                  <tr><td>standard deviation</td><td>dispersion of values around the mean.</td></tr>
                  <tr><td>minimum</td><td>smallest observed value.</td></tr>
                  <tr><td>first quartile (Q1)</td><td>25th percentile of the distribution.</td></tr>
                  <tr><td>median</td><td>50th percentile (middle value).</td></tr>
                  <tr><td>third quartile (Q3)</td><td>75th percentile of the distribution.</td></tr>
                  <tr><td>maximum</td><td>largest observed value.</td></tr>
                  <tr><td>missing</td><td>number of entries with no value (NA/null).</td></tr>
                </tbody>
              </table>
              <b> Statistics present for categorical features:</b>
              <table className={TutorialStyles.variablesTable}>
                <tbody>
                  <tr><td>count</td><td>number of non-missing records for the feature.</td></tr>
                  <tr><td>mode</td><td>most frequent category value.</td></tr>
                  <tr><td>mode frequency</td><td>absolute count of the mode.</td></tr>
                  <tr><td>mode percentage</td><td>relative frequency of the mode (% of non-missing).</td></tr>
                  <tr><td>second mode</td><td>second most frequent category value.</td></tr>
                  <tr><td>second mode frequency</td><td>absolute count of the second mode.</td></tr>
                  <tr><td>second mode percentage</td><td>relative frequency of the second mode (% of non-missing).</td></tr>
                  <tr><td>missing</td><td>number of entries with no value (NA/null).</td></tr>
                </tbody>
              </table>
              Each feature has a graphical representation of its distribution. For continuous features,
              a histogram is shown, and for categorical features, a bar chart is shown. Either clicking on the
              feature name in the corresponding table or on the graph will select that feature. To inspect the graphs
              closer, they can be expanded by double clicking them.
            </span>
          </div>
        </div>
      </div>
      <div id="Discovery:-aggregate-metrics" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery: Aggregate metrics</h2>
            <span className={TutorialStyles.introText}>
              Clicking the 'Display aggregate metrics' toggle in the sidebar switches to a view that displays
              aggregate statistics for categorical features. This view contains thee elements: the aggregate data grid,
              the chi-squared test results and the omitted features list.
              <Slide images={AggregateSlides} steps={AggregateSteps} />
              The data grid that shows correlations and covariances. To switch between them, use the selector at
              the top-left of the component. To better visualize it, an indicator is present in the middle of the
              page that allows resizing the elements present in the view.
              <br />
              <br />
              The chi-squared test results table shows the results of applying this statistical test to each pair of
              categorical features. This test determines whether there is a significant association between the two features.
              On the other side of the view, the omitted features list shows the features that were not included in the
              calculations of the aggregate metrics, next to the reason why nd the amount of missing values they had.
            </span>
          </div>
        </div>
      </div>
      <div id="Integration" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration</h2>
            <span className={TutorialStyles.introText}>
              The <em>Integration</em> view allows you to either structurally or semantically align the features present
              in the datasets of the selected institution(s). To do so, you must first select one or more metadata files
              to select the pile of features to work with. Once a file is selected, the view will load the view, which
              features present in it.
              The output table shows the biological entities that meet the biological selection criteria.
              Since a user can design complex query patterns and has the freedom to choose
              which entities they want to include in the output ("Select output" button), duplicate entities might appear in the result.
            </span>
          </div>
        </div>
      </div>
      <div id="Integration:-updating-files" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration: Updating files</h2>
            <span className={TutorialStyles.introText}>
              This tutorial is still in development. The output table shows the biological entities that meet the biological selection criteria.
              Since a user can design complex query patterns and has the freedom to choose
              which entities they want to include in the output ("Select output" button), duplicate entities might appear in the result.
              <br />

              <p className={TutorialStyles.lesserText}>
                The properties are detailed with examples and their domains <a href="https://github.com/juan-mulero/cisreg/blob/main/BGW_graphs.xlsx" target="_blank" rel="noopener noreferrer">here</a>.
              </p>


              <br />
              For example, in the previous query (<i>Which CRMs have been identified in heart (UBERON_0000948) and liver (UBERON_0002107)?</i>)
              we can select the CRM sequences and tissues in the output ("Select output").
              But we can also select only the CRM sequences, or only the tissues.
              Since a CRM can be found in both the heart and the liver, those CRMs found in both tissues would appear duplicated
              if we only chose CRMs in the output. This is because the CRM fits the search pattern in both cases.
              For this reason, the "Distinct" button is activated for automatic filtering.
            </span>
          </div>
        </div>
      </div>
    </div >
  );
}

export default Tutorial;
