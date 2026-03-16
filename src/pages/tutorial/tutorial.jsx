
import React, { useMemo, useLayoutEffect } from "react";
import ScrollSidebar from "../../components/Common/ScrollSidebar/scrollSidebar";
import TutorialStyles from "./tutorial.module.css";
import Slide from '../../components/Common/Slide/slide';
import PageImage from "../../components/Common/PageImage/pageImage";
import { DiscoverySlides, AggregateSlides, IntegrationSlides } from "./images";

// Tutorial page for the platform
function Tutorial() {

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
    'Integration display',
    'Feature column, containing all the features present in the selected metadata files.',
    'Features selected to map.',
    'Map building controls.',
    'Resulting map to be applied.'
  ];

  const sections = useMemo(() => [
    'Introduction',
    'Navigating-the-tool',
    'Selecting-files',
    'Discovery',
    'Discovery:-individual-metrics',
    'Discovery:-aggregate-metrics',
    'Integration',
    'Integration:-updating-files',
    'Semantic-alignment',
    'HL7-FHIR'
  ], []);

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
                imageSrc={require("../../resources/images/tutorial/1_nodes.gif")}
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
                imageSrc={require("../../resources/images/tutorial/2_navbar.gif")}
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
            <p className={TutorialStyles.lesserText}>
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
              to select the pile of features to work with.
              <Slide images={IntegrationSlides} steps={IntegrationSteps} />
              At the left, the feature column lists the names of the feature columns present in the datasets. Either clicking
              them or dragging them onto the selection area will add them to the list of features to map. Once a feature
              is added, it's range of values are able to be selected in the control panel. Hovering over selected elements
              will reveal a delete button to remove them from the selection.
              <br />
              <br />
              The space between the selected features and the control panel is resizable. To do so, drag the grey element
              between them to adjust the space as needed. Previously to defining the mappings, a user can load a JSON schema
              describing the mapping structure to make the platform give suggestions and ease the mapping process. To start
              defining mappings, input a name for the resulting column and then add each value that column will have. In each
              value, you need to define it's content and what values from the selected features it will map. In this selection,
              continuous features will allow you to select ranges of values, while categorical features will allow you to
              select individual values. Once the mapping is defined, click the "Add mapping" button to add it to the resulting map.
              <p className={TutorialStyles.lesserText}>
                <em>Note:</em> You can Also configure the mapping to automatically substitute the features it maps or
                set it to one-hot encode the resulting column by using the controls at the left of the name input.
              </p>
              <PageImage
                imageSrc={require("../../resources/images/tutorial/3_integration_usage.gif")}
                maintainAspectRatio={true}
                alt="Dragging nodes and joining them"
              />
              Once a mapping is added, it will appear in the resulting map area. This area lists all the features that will
              be present when applied to a file. On each mapping, you can see it's name, where it is from and a summary of
              the values it maps. At first, this list will display the features already present in the files: As you declare
              new custom ones and remove other features, this list will result in the shape of the final file.
              Each mapping can be deleted by clicking the upper right cross that appears on hover. Double clicking either
              the feature name or one of the values allows you to edit it.
            </span>
          </div>
        </div>
      </div>
      <div id="Integration:-updating-files" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration: Updating files</h2>
            <span className={TutorialStyles.introText}>
              After declaring the correct mapping configuration, you can either download the resulting map by clicking the
              'Download Mappings' button or apply it to datasets located in the node. Clicking the green arrow button will
              directly redirect you to the semantic alignment view, selecting the file produced by applying the map.
              < br />
              < br />
              To apply the map to datasets located in the node, click the 'Process datasets' button. This will open a modal
              where you can select the files to process, grouped by in which server they are located. Clicking any of the
              file entries will toggle them for processing. The available data cleaning options are also available in this
              modal. By clicking the 'Data cleaning' button, you are able to set duplicate deletion, removal of empty rows
              and date standardization. Once the files are selected and the cleaning options are configured, click the 'Apply'
              button at the bottom to process the files. By clicking the leftmost green arrow button, the Discovery view will
              be opened, selecting the integrated files for exploration.
              <PageImage
                imageSrc={require("../../resources/images/tutorial/4_change_files_modal.png")}
                maintainAspectRatio={true}
                alt="Dragging nodes and joining them"
              />
            </span>
          </div>
        </div>
      </div>


      <div id="Semantic-alignment" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Semantic Alignment</h2>
            <span className={TutorialStyles.introText}>
              This section is still incomplete.
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </span>
          </div>
        </div>
      </div>

      <div id="HL7-FHIR" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>HL7 FHIR</h2>
            <span className={TutorialStyles.introText}>
              This section is still incomplete.
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </span>
          </div>
        </div>
      </div>
    </div >
  );
}

export default Tutorial;
