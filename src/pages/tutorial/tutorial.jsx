import React, { useMemo, useLayoutEffect } from "react";
import ScrollSidebar from "../../components/Common/ScrollSidebar/scrollSidebar";
import TutorialStyles from "./tutorial.module.css";
import Slide from '../../components/Common/Slide/slide';
import PageImage from "../../components/Common/PageImage/pageImage";
import projectPng from "../../resources/images/tutorial/5_project.png";
import nodesGif from "../../resources/images/tutorial/1_nodes.gif";
import navbarGif from "../../resources/images/tutorial/2_navbar.gif";
import fileExplorerPng from "../../resources/images/tutorial/6_fileexplorer.png";
import integrationUsageGif from "../../resources/images/tutorial/3_integration_usage.gif";
import suggestionUsageGif from "../../resources/images/tutorial/8_suggestions.gif";
import changeFilesModalPng from "../../resources/images/tutorial/4_change_files_modal.png";
import metadataGif from "../../resources/images/tutorial/9_metadata.gif";
import fhirViewPng from "../../resources/images/tutorial/7_fhir.png";

import { DiscoverySlides, AggregateSlides, IntegrationSlides, SemanticAlignmentSlides } from "./images";

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
    'Sidebar containing most of the page controls.'
  ];

  const AggregateSteps = [
    'Aggregate statistics display',
    'Aggregate statistics table',
    'Chi-Squared test results.',
    'List of omitted features in the calculations.',
    'Sidebar containing most of the page controls.'
  ];

  const IntegrationSteps = [
    'Integration display',
    'Feature column, containing all the features present in the selected metadata files.',
    'Features selected to map.',
    'Map building controls.',
    'Resulting map to be applied.'
  ];

  const SemanticAlignmentSteps = [
    'Overall Semantic Alignment view.',
    'Mapped elements sidebar, where the uploaded elements are listed and can be selected.',
    'Detail panel, where the semantic pattern and ontology-related fields are configured.',
    'Workspace, where created semantic cards are displayed and organized visually.'
  ];

  const sections = useMemo(() => [
    'Introduction',
    'Navigating-the-tool',
    'Selecting-files',
    'Data-cleaning',
    'Discovery',
    'Discovery:-individual-metrics',
    'Discovery:-aggregate-metrics',
    'Integration',
    'Integration:-creating-mappings',
    'Integration:-semantic-enrichment',
    'Integration:-updating-files',
    'Semantic-alignment',
    'Semantic-alignment:-generating-rdf',
    'HL7-FHIR'
  ], []);

  const discoveryControls = [
    {
      title: "Selected feature & type switch",
      description:
        "Shows the currently selected feature and allows recalculating it as categorical or continuous. This updates the statistics returned for that feature and changes how it is displayed.",
      accent: "green",
      icon: "bars",
    },
    {
      title: "File selector",
      description:
        "When multiple files are loaded, lets you choose which files contribute to the current view. Files are grouped by Node.",
      accent: "amber",
      icon: "folder",
    },
    {
      title: "Feature toggles",
      description:
        "Lets you show or hide individual features from the tables and charts. A search box is also available, together with a Show All / Hide All control for the currently displayed results.",
      accent: "orange",
      icon: "toggle",
    },
    {
      title: "Outliers switch",
      description:
        "Shows or hides detected outliers in continuous and date-based charts.",
      accent: "coral",
      icon: "warning",
    },
    {
      title: "View switch",
      description:
        "Switches between individual metrics and aggregate metrics.",
      accent: "blue",
      icon: "chart",
    },
    {
      title: "Filters",
      description:
        "Opens the filter panel to define feature-specific filters. Categorical features can be filtered by selected categories; continuous features support equal, between, less than, and greater than conditions; date features support equal, between, sooner than, and later than conditions. Multiple criteria can be added to the same feature and combined with AND or OR, and filters across features can also be combined globally.",
      accent: "purple",
      icon: "filter",
    },
    {
      title: "Integrity metrics",
      description:
        "When multiple files are loaded, opens a modal comparing per-file quality indicators.",
      accent: "green",
      icon: "check",
    },
    {
      title: "Export data",
      description:
        "Exports the currently available Discovery statistics.",
      accent: "teal",
      icon: "download",
    },
    {
      title: "Upload elements",
      description:
        "Exports the generated metadata so that it can be used later in the Integration tab.",
      accent: "emerald",
      icon: "upload",
    },
  ];

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
              <em>MEDIATA</em> is a platform developed to address all interoperability-related aspects
              of sensitive clinical patient datasets, regardless of their encoding or server restrictions.
              It can be used to analyze and prepare distributed clinical tabular data for federated machine
              learning through discovery, preprocessing and integration, semantic alignment with ontologies,
              and HL7 FHIR standardization. The goal is to facilitate harmonized and standardized datasets,
              as well as mappings that support researchers in their work.
            </p>
            <p>
              To participate in and use the tool within your project,
              please contact the{" "}
              <a
                href="https://semantics.inf.um.es/mediata/#/about"
                target="_blank"
                rel="noopener noreferrer"
              >
                development team
              </a>.
            </p>
            <p>
              This tutorial serves as a user guide for interacting with an already deployed instance of the application.
              To deploy a local instance, follow the instructions in the{" "}
              <a
                href="https://semantics.inf.um.es/mediata/#/about"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>.
            </p>
          </div>
        </div>
      </div>

      <div
        id="Navigating-the-tool"
        className={`${TutorialStyles.contentContainer} ${TutorialStyles.featureSection}`}
      >
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Navigating the tool</h2>
            <div className={TutorialStyles.introText}>
              <p>
                To access the platform, you must first log in with your credentials.
                Click the <strong>Login</strong> button in the top-right corner of the navigation bar
                to access the login page, and enter the credentials provided by the development team.
              </p>
              <p>
                For local instances of the platform, use the default credentials configured during deployment
                (user <code>admin</code> with password <code>admin</code> by default).
              </p>
              <p>
                The first step in using the platform is to access the harmonization project in which your datasets participate.
                A project is an organizational unit that groups participating institutions using the platform,
                enabling them to interact with their datasets and harmonize them simultaneously.
              </p>
              <p>
                For local instances of the platform, use the default project (named <code>default</code>).
              </p>
              <PageImage
                imageSrc={projectPng}
                maintainAspectRatio={true}
                alt="Project selection modal"
              />
              <p>
                After selecting your project, you will be redirected to the node view. Here, each institution
                participating in the harmonization pipeline (referred to as a Node within the platform)
                is represented by a colored circle with a server icon in the center. You can select an
                institution to work with by double-clicking it.
              </p>
              <p>
                For local instances of the platform, use the default Node
                (named <code>MEDIATA</code> with the description <code>Your MEDIATA server</code>).
              </p>
              <p>
                Alternatively, if there are multiple participants, you may choose to work with multiple Nodes
                at the same time. To do this, drag the Nodes of interest next to each other and click the
                <em> Join nodes</em> control that appears between them.
              </p>
              <PageImage
                imageSrc={nodesGif}
                maintainAspectRatio={true}
                alt="Dragging and joining nodes"
              />
              <p>
                Clicking a Node (or a group of Nodes) displays the DCAT descriptions
                configured for the datasets within it. If multiple Nodes are opened
                at once, each of them will have its own collapsible tab. Expanding a tab will display
                these descriptions for the corresponding Node.
              </p>
              <p>
                While DCAT descriptions are public, working within each Node (that is, accessing
                and interacting with the institution it represents) requires appropriate site-specific
                user permissions. If you believe you should have these permissions but do not,
                please contact the development team.
              </p>
              <p>
                For local instances of the platform, the default user has unrestricted access to all functionality.
              </p>
            </div>
            <div className={TutorialStyles.introText}>
              <p>
                Inside a Node, you can access the tool&apos;s different functionalities. New options
                will appear on the left side of the top bar. The view that is currently selected will appear
                highlighted. You can also return to the Projects tab to select a different project, or back to
                the Nodes view by clicking the back button in the file selector.
                A highlight indicates your current section. Clicking the section you are already in will reload that page.
              </p>
              <p className={TutorialStyles.lesserText}>
                <em>Note:</em> Some sections of the platform may not be available if their modules were omitted during
                deployment. The federated platform includes all of them.
              </p>
              <PageImage
                imageSrc={navbarGif}
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
          <div className={TutorialStyles.introText}>
            <p>
              The files needed to use the different sections of the platform are selected through the File Explorer.
              The files displayed depend on the current view and the selected Node or Nodes. For example,
              the Discovery view FIle Explorer displays the raw datasets, while in the Integration view it only shows produced metadata
              or other generated files required for that stage of the harmonization workflow. Only files with appropriate extensions
              are shown for selection (datasets need to be either .csv, .tsv or .xlsx).
            </p>
            <p>
              The File Explorer shows each available file, together with its size and creation and
              modification dates. If you are working at multiple Nodes at the same time, files show
              grouped by Node in collapsible sections.
            </p>
            <p>
              To select a file, click its row. The selected row will be highlighted. You can open the
              selected file by double-clicking it, by pressing <code>Enter</code>, or by clicking the
              <strong> Open</strong> button in the toolbar.
            </p>
            <PageImage
              imageSrc={fileExplorerPng}
              maintainAspectRatio={true}
              alt="File explorer modal"
            />
            <p>
              The explorer also supports selecting multiple files, either from the same Node or from different Nodes,
              allowing you to compare and work with multiple datasets simultaneously. You can do this by using
              <code> Ctrl</code>-click to toggle individual files, <code>Shift</code>-click to select a range,
              or by long-pressing a file row to enter multiple-selection mode. When this mode is active, the toolbar
              will indicate that multiple files are selected in the top-right corner.
            </p>
            <p>
              Other basic controls, such as renaming or deletion, are also available.
            </p>
          </div>
        </div>
      </div>

      <div id="Data-cleaning" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textContainer}>
          <h2 className={TutorialStyles.centeredHeading}>Data cleaning</h2>
          <div className={TutorialStyles.introText}>
            <p>
              When working with datasets in the File Explorer, like when first accessing the Discovery tab,
              you can apply preprocessing operations by selecting one or more files and clicking the <strong>Data cleaning </strong>
              button in the toolbar. This opens the Data cleaning panel, where all the available cleaning steps can be
              configured before being applied to the selected files.
            </p>
            <p>
              The panel includes a search box that allows you to quickly find available cleaning steps.
              Each step can be enabled individually. The following table summarizes the available operations
              and what each one does.
            </p>
            <table className={TutorialStyles.variablesTable}>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Remove empty rows</td>
                  <td>Deletes rows in which every field is empty or contains only whitespace.</td>
                </tr>
                <tr>
                  <td>Remove duplicates</td>
                  <td>Deletes duplicate rows with identical values across all columns.</td>
                </tr>
                <tr>
                  <td>Remove rows with pattern</td>
                  <td>Deletes rows whose value in a selected column matches a given regular expression.</td>
                </tr>
                <tr>
                  <td>Keep only numeric rows</td>
                  <td>Keeps only rows where the selected columns contain valid numeric values.</td>
                </tr>
                <tr>
                  <td>Trim whitespace</td>
                  <td>Removes leading and trailing whitespace from cell values.</td>
                </tr>
                <tr>
                  <td>Remove extra spaces</td>
                  <td>Collapses repeated internal whitespace into a single space.</td>
                </tr>
                <tr>
                  <td>Remove line breaks</td>
                  <td>Replaces line breaks inside cell values with spaces.</td>
                </tr>
                <tr>
                  <td>Normalize text</td>
                  <td>Standardizes spacing in text values by trimming them and reducing repeated whitespace.</td>
                </tr>
                <tr>
                  <td>Standardize case</td>
                  <td>Converts text to uppercase, lowercase, title case, or sentence case.</td>
                </tr>
                <tr>
                  <td>Remove special characters</td>
                  <td>Removes non-alphanumeric characters except spaces, periods, commas, hyphens, and underscores.</td>
                </tr>
                <tr>
                  <td>Remove punctuation</td>
                  <td>Removes punctuation characters from text values.</td>
                </tr>
                <tr>
                  <td>Remove non-printable characters</td>
                  <td>Removes hidden or control characters that may appear because of malformed input.</td>
                </tr>
                <tr>
                  <td>Fix encoding</td>
                  <td>Attempts to repair common text-encoding problems such as mojibake.</td>
                </tr>
                <tr>
                  <td>Normalize Unicode</td>
                  <td>Converts text to a selected Unicode normalization form, such as NFC or NFKC.</td>
                </tr>
                <tr>
                  <td>Standardize dates</td>
                  <td>Parses recognized date values and rewrites them using a single output format.</td>
                </tr>
                <tr>
                  <td>Extract date components</td>
                  <td>Creates additional columns with the year, month, and day extracted from date values.</td>
                </tr>
                <tr>
                  <td>Standardize numeric values</td>
                  <td>Converts selected numeric columns to a consistent numeric representation, such as integer or decimal.</td>
                </tr>
                <tr>
                  <td>Remove leading zeros</td>
                  <td>Removes leading zeros from numeric-looking values.</td>
                </tr>
                <tr>
                  <td>Round decimals</td>
                  <td>Rounds numeric values to the configured number of decimal places.</td>
                </tr>
                <tr>
                  <td>Replace values</td>
                  <td>Replaces exact values according to a user-provided mapping.</td>
                </tr>
                <tr>
                  <td>Strip prefix</td>
                  <td>Removes a specified prefix from values when present.</td>
                </tr>
                <tr>
                  <td>Strip suffix</td>
                  <td>Removes a specified suffix from values when present.</td>
                </tr>
                <tr>
                  <td>Pad values</td>
                  <td>Adds characters to the left or right of values until they reach a specified length.</td>
                </tr>
                <tr>
                  <td>Fill missing values</td>
                  <td>Fills empty cells using a selected strategy, such as a constant value, mean, median, mode, forward fill, backward fill, or interpolation.</td>
                </tr>
                <tr>
                  <td>Extract email domain</td>
                  <td>Creates a new column containing the domain part of detected email addresses.</td>
                </tr>
                <tr>
                  <td>Validate emails</td>
                  <td>Checks email-like values and clears those that do not match a valid email format.</td>
                </tr>
                <tr>
                  <td>Extract URL components</td>
                  <td>Creates new columns for detected URLs, including protocol, domain, path, and query string.</td>
                </tr>
                <tr>
                  <td>Normalize URLs</td>
                  <td>Standardizes URLs by lowercasing them and removing trailing slashes.</td>
                </tr>
                <tr>
                  <td>Standardize phone numbers</td>
                  <td>Reformats phone numbers into a selected output format, such as national, international, or E.164.</td>
                </tr>
                <tr>
                  <td>Split column</td>
                  <td>Splits the values of one column into multiple columns using a chosen delimiter.</td>
                </tr>
                <tr>
                  <td>Merge columns</td>
                  <td>Combines multiple columns into a single new column using a chosen delimiter.</td>
                </tr>
                <tr>
                  <td>Convert data types</td>
                  <td>Converts selected columns to target types such as integer, float, boolean, or string.</td>
                </tr>
                <tr>
                  <td>Normalize data</td>
                  <td>Applies min-max normalization to selected numeric columns so values are rescaled between 0 and 1.</td>
                </tr>
                <tr>
                  <td>Standardize data</td>
                  <td>Applies Z-score standardization to selected numeric columns.</td>
                </tr>
                <tr>
                  <td>Bin data</td>
                  <td>Groups numeric values into intervals and stores the result in a new binned column.</td>
                </tr>
                <tr>
                  <td>Merge similar values</td>
                  <td>Uses fuzzy matching to replace similar text values with a single canonical value.</td>
                </tr>
              </tbody>
            </table>
            <p>
              Some steps require extra input before they can be applied. For example, numeric
              standardization requires the target columns to be specified, filling missing values requires
              a strategy, and JSON-based operations such as value replacement or type conversion require a
              valid JSON object. If any required configuration is missing or invalid, the platform will
              display an error message and prevent the cleaning process from starting.
            </p>
            <p>
              After configuration, click <strong>Apply</strong> to start cleaning the selected files.
              Once the process finishes,
              the cleaned files are reloaded and become available in the explorer.
            </p>
            <p className={TutorialStyles.lesserText}>
              <em>Note:</em> Data cleaning is only available in the dataset explorer. At least one file
              and one cleaning step must be selected before the operation can be applied.
            </p>
          </div>
        </div>
      </div>

      <div id="Discovery" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery</h2>
            <div className={TutorialStyles.introText}>
              <p>
                <em>Discovery</em> is the section shown after accessing a Node. It provides descriptive statistics
                for the selected dataset files, both at the level of individual features and through aggregate
                relationships between features. By default, the view opens in the individual-metrics mode.
              </p>

              <p>
                In the individual view, three main areas can be distinguished: the feature tables, the charts,
                and the sidebar. The same sidebar remains available in the aggregate view and contains most
                of the controls used in this section.
              </p>

              <Slide images={DiscoverySlides} steps={DiscoverySteps} />

              <div className={TutorialStyles.controlsListSection}>
                <div className={TutorialStyles.controlsListCard}>
                  <h3 className={TutorialStyles.controlsListTitle}>
                    The sidebar contains the following controls:
                  </h3>

                  <div className={TutorialStyles.controlsList}>
                    {discoveryControls.map((control) => (
                      <div
                        key={control.title}
                        className={TutorialStyles.controlItem}
                      >
                        <div className={TutorialStyles.controlContent}>
                          <div className={TutorialStyles.controlHeading}>
                            {control.title}
                          </div>
                          <p className={TutorialStyles.controlDescription}>
                            {control.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="Discovery:-individual-metrics" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery: Individual metrics</h2>
            <div className={TutorialStyles.introText}>
              <p>
                The default <em>Discovery</em> view displays statistics for individual features. The upper part of
                the page contains two tables: one table for continuous and date features, and another for
                categorical features. Each row corresponds to one feature. Table columns are resizable by
                dragging the separator between them.
              </p>

              <p><b>Statistics shown for continuous features:</b></p>
              <table className={TutorialStyles.variablesTable}>
                <tbody>
                  <tr><td>count</td><td>Number of non-missing numeric values detected for the feature.</td></tr>
                  <tr><td>mean</td><td>Arithmetic mean of the values.</td></tr>
                  <tr><td>standard deviation</td><td>Dispersion of the values around the mean.</td></tr>
                  <tr><td>minimum</td><td>Smallest observed value.</td></tr>
                  <tr><td>first quartile (Q1)</td><td>25th percentile of the distribution.</td></tr>
                  <tr><td>median</td><td>50th percentile of the distribution.</td></tr>
                  <tr><td>third quartile (Q3)</td><td>75th percentile of the distribution.</td></tr>
                  <tr><td>maximum</td><td>Largest observed value.</td></tr>
                  <tr><td>missing entries</td><td>Number of missing values, shown together with a percentage indicator.</td></tr>
                </tbody>
              </table>

              <p><b>Statistics shown for date features:</b></p>
              <table className={TutorialStyles.variablesTable}>
                <tbody>
                  <tr><td>count</td><td>Number of non-missing date values detected for the feature.</td></tr>
                  <tr><td>mean</td><td>Average date value represented as a date.</td></tr>
                  <tr><td>standard deviation</td><td>Dispersion of the date values.</td></tr>
                  <tr><td>minimum</td><td>Earliest observed date.</td></tr>
                  <tr><td>first quartile (Q1)</td><td>Date at the 25th percentile.</td></tr>
                  <tr><td>median</td><td>Date at the 50th percentile.</td></tr>
                  <tr><td>third quartile (Q3)</td><td>Date at the 75th percentile.</td></tr>
                  <tr><td>maximum</td><td>Latest observed date.</td></tr>
                  <tr><td>missing entries</td><td>Number of missing values, shown together with a percentage indicator.</td></tr>
                </tbody>
              </table>

              <p><b>Statistics shown for categorical features:</b></p>
              <table className={TutorialStyles.variablesTable}>
                <tbody>
                  <tr><td>total count</td><td>Number of non-missing records for the feature.</td></tr>
                  <tr><td>mode</td><td>Most frequent category value.</td></tr>
                  <tr><td>mode frequency</td><td>Absolute number of occurrences of the mode.</td></tr>
                  <tr><td>mode %</td><td>Percentage of total records represented by the mode.</td></tr>
                  <tr><td>2nd mode</td><td>Second most frequent category value.</td></tr>
                  <tr><td>2nd mode frequency</td><td>Absolute number of occurrences of the second mode.</td></tr>
                  <tr><td>2nd mode %</td><td>Percentage of total records represented by the second mode.</td></tr>
                  <tr><td>missing entries</td><td>Number of missing values, shown together with a percentage indicator.</td></tr>
                </tbody>
              </table>

              <p>
                Each feature is also displayed with a graphical representation. Continuous features are shown with continuous-value
                charts, categorical features are shown with bar charts, and date features are shown with date-based
                charts. Clicking a feature in a table or chart selects it. On desktop viewports, charts can be
                enlarged by double-clicking them.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="Discovery:-aggregate-metrics" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery: Aggregate metrics</h2>
            <div className={TutorialStyles.introText}>
              <p>
                Clicking the <em>Display aggregate metrics</em> control in the sidebar switches to the aggregate view.
                This view contains a matrix of relationships between continuous features, together with a chi-squared
                results panel for categorical features and a list of omitted features.
              </p>

              <Slide images={AggregateSlides} steps={AggregateSteps} />

              <p>
                The upper matrix can display one of three statistics: <b>covariance</b>, <b>Pearson correlation</b>,
                or <b>Spearman correlation</b>. These are selected using the dropdown at the top-left of the matrix.
                The divider in the middle of the view can be dragged to resize the upper and lower panels.
              </p>

              <p>
                The lower-left panel shows the results of chi-squared tests between pairs of categorical features.
                For each pair, the displayed value is the test p-value.
              </p>

              <p>
                The lower-right panel lists omitted features. These are categorical features that were excluded from
                aggregate categorical analysis because they are not suitable for it, for example because they have too
                many unique values, exceed the maximum number of categories, or appear to contain UUID-like identifiers.
                The list also includes the reason for omission and the percentage of missing values for each omitted feature.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        id="Integration"
        className={`${TutorialStyles.contentContainer} ${TutorialStyles.featureSection}`}
      >
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration</h2>
            <div className={TutorialStyles.introText}>
              <p>
                The <em>Integration</em> view allows you to structurally or semantically align the features present
                in the datasets of the selected institution(s). To begin, you must first select one or more metadata
                files, which will determine the set of features available to work with.
              </p>

              <Slide images={IntegrationSlides} steps={IntegrationSteps} />

              <p>
                On the left, the feature column lists the names of the columns present in each dataset.
                Features can be searched using the search bar at the top of the list. The two controls
                next to the search input allow you to expand or collapse all dataset feature lists.
              </p>

              <p>
                Clicking a feature, or dragging it into the selection area at the top center,
                adds it to the list of features to be mapped. Once a feature is added, its range
                of values will be selectable in the control panel. Hovering over selected features
                reveals a delete button in the top-right corner, which removes them from the selection.
              </p>

              <p>
                On the right, the resulting mappings are displayed. By default, this list is populated with
                all columns already present in each dataset, leaving them unaltered. Hovering over each mapping
                reveals a delete button in the top-right corner, allowing you to remove it from the final result.
                A search function is also available at the top of this panel.
              </p>

              <p>
                Before defining mappings, you can load a JSON schema using the <em>Schema</em> tab on the right.
                This schema describes the expected mapping structure, enabling the platform to provide suggestions
                and streamline the mapping process.
              </p>

              <p>
                In the center, the main controls for defining mappings are available.
                The space between the selected features and the control panel is resizable;
                drag the grey divider between them to adjust the layout as needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="Integration:-creating-mappings" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration: Creating mappings</h2>
            <div className={TutorialStyles.introText}>
              <p>
                To start defining a mapping for the datasets, enter a name for the resulting column in the top input,
                then add each value that the column will contain. To do this, click the <em>Add Value</em> button once
                for each value that the resulting column should include.
              </p>
              <p>
                For each value, you must define its content (what will be displayed in the column) and which values from
                the selected features it maps to. Clicking the <em>Add mapping</em> button will display the available
                contents of the selected features so you can define the mapping. In this selection, categorical features
                allow you to choose individual categories, while continuous features allow you to define value ranges.
                Clicking the numbers in a range allows you to edit them manually. Once assigned, values cannot be reused
                elsewhere, preventing inconsistencies. These definitions will appear under the value once set, and can be
                removed to make them available again.
              </p>
              <p>
                You may automatically remove all source features used in a mapping from the resulting dataset by enabling
                the <em>Remove columns</em> switch. Enabling the <em>One-hot</em> switch will instead configure a one-hot
                encoding structure for the selected columns and values. Once all required values are defined and the mapping
                is complete, click the &quot;Add mapping&quot; button to add it to the resulting map.
              </p>

              <PageImage
                imageSrc={integrationUsageGif}
                maintainAspectRatio={true}
                alt="Defining the 'Toilet' mapping between datasets"
              />

              <p>
                Rather than defining all mappings manually, you can click the <em>Suggest mappings</em> button to automatically
                generate a set of mappings covering all features across the datasets. You can choose whether to append these
                mappings to your existing ones or replace them entirely (for example, to use them as a starting point instead
                of the default mappings).
              </p>

              <PageImage
                imageSrc={suggestionUsageGif}
                maintainAspectRatio={true}
                alt="Automatically generated mapping suggestions"
              />

              <p>
                Once a mapping is added, it will appear in the resulting map area. This area lists all features that will be
                present when applied to a file. Each mapping displays its name, origin, and a summary of its values. Double-clicking
                the feature name or any value allows you to edit it, and selecting a mapping loads its configuration back into
                the control panel for further modification.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="Integration:-semantic-enrichment" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration: Semantic enrichment</h2>
            <div className={TutorialStyles.introText}>
              <p>
                If you are only performing structural harmonization, no further steps are required beyond defining the mappings.
                However, to enrich datasets semantically, additional metadata controls are available in the control panel.
                Next to both the column name and each value input, you can assign corresponding terminology. SNOMED-CT
                suggestions are provided and can be selected directly from the input.
              </p>
              <p>
                In addition, each field can include a description. Clicking the <em>Description</em> button allows you to define
                a textual explanation for each field. In the resulting mappings list, mappings that include metadata will display
                an icon indicating its presence.
              </p>
              <p>
                Although this metadata is not currently used directly by the application, it is intended to support the transformation
                of datasets into a standardized, interoperable ontology. This will enable datasets within a project to be combined,
                supporting not only data parsing but also seamless conversion to widely used clinical standards.
              </p>
              {
                <PageImage
                  imageSrc={metadataGif}
                  maintainAspectRatio={true}
                  alt="Present metadata in the Toilet column"
                />
              }
            </div>
          </div>
        </div>
      </div>

      <div id="Integration:-updating-files" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Integration: Updating files</h2>
            <div className={TutorialStyles.introText}>
              <p>
                After defining the desired mappings for your datasets, you can either download them locally by clicking
                the &apos;Download Mappings&apos; button or apply them directly to datasets located in the node. The files produced
                serve as the starting input for the Semantic Alignment tab of the application. Clicking the green arrow button next
                to &apos;Download Mappings&apos; will redirect you to this tab with the generated file already loaded.
              </p>

              <p>
                To apply the mappings to your datasets, click the &apos;Process datasets&apos; button. This opens a modal where,
                for each selected source file, all compatible datasets within its node are displayed. This allows you to apply
                the same mapping to multiple files that share the same structure. Clicking a file toggles it for processing,
                applying all transformations defined by the mapping.
              </p>

              <PageImage
                imageSrc={changeFilesModalPng}
                maintainAspectRatio={true}
                alt="Processing datasets modal"
              />

              <p>
                Once all relevant files have been selected, click &apos;Apply&apos; to execute the mappings. The processed datasets
                are stored in the same folder as the original files, sharing the same name but with a &apos;parsed_&apos; prefix.
                For clarity, it is recommended to rename these files using the file explorer (via the &apos;Rename file&apos; button).
                Clicking the back arrow will both apply the mappings and open the resulting files in the Discovery tab for
                further analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="Semantic-alignment" className={`${TutorialStyles.contentContainer} ${TutorialStyles.featureSection}`}  >
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Semantic Alignment</h2>
            <div className={TutorialStyles.introText}>
              <p>
                The <em>Semantic Alignment</em> view allows you to enrich the mapped elements produced in the
                <em> Integration</em> tab with ontology-based semantics and prepare them for semantic export.
                In this view, you work with the mapped elements generated during integration and describe their
                meaning using the available semantic patterns and terminology fields.
              </p>

              <p className={TutorialStyles.lesserText}>
                <em>Note:</em> This functionality may be disabled in limited deployments of the platform.
              </p>

              <p>
                When first opening this view, you will be prompted to upload a CSV file containing the mapped elements.
                Generating this file from the Integration tab is recommended. Once loaded, all the elements will
                appear in the sidebar on the left. Selecting an element opens its configuration panel, where you
                can choose the semantic pattern that best represents it and fill in the corresponding ontology
                fields required by that pattern.
              </p>

              <Slide images={SemanticAlignmentSlides} steps={SemanticAlignmentSteps} />

              <p>
                Three semantic statement patterns are currently supported:
                <strong> ObservationResultStatement</strong>,
                <strong> ClinicalSituationStatement</strong>, and
                <strong> ClinicalProcedureStatement</strong>.
                Each pattern is intended for a different type of clinical information, so the available form fields
                change depending on the selected option.
              </p>

              <p>
                In the detail panel, you can assign ontology and terminology information to each mapped element.
                Suggestions are available while filling in the semantic fields, helping you define the appropriate
                ontology mapping, observable, finding, procedure, temporal context, statement context, and other
                properties required by the selected pattern. Once the information for an element has been completed,
                clicking the build button adds it as a card in the workspace.
              </p>

              <p>
                The workspace on the right displays all created semantic cards. Each card represents one mapped element
                together with the statement type and metadata assigned to it. Cards can be dragged freely to organize
                them visually. Selecting a card returns its configuration to the detail panel, allowing you to review
                or modify it. Cards may also be connected to one another to describe semantic relationships between generated statements.
                However, these connections currently serve only as a visual guide inside the workspace.
                The boundary between the detail panel and the workspace is resizable by dragging the gray separator.
                Zoom controls are also available for the workspace.
              </p>

            </div>
          </div>
        </div>
      </div>

      <div id="Semantic-alignment:-generating-rdf" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Semantic Alignment: Generating RDF</h2>
            <div className={TutorialStyles.introText}>
              <p>
                Once all relevant elements have been semantically described, click the <em>Process</em> button to
                generate the semantic mappings and start the RDF generation process.
              </p>

              <p>
                During this step, the configured semantic mappings are applied to the selected mapped elements so that
                they can be transformed into a semantically enriched representation. Depending on the type of element,
                the resulting output may include categorical values, numeric values, dates, contextual properties, and
                the terminology assignments defined in the Semantic Alignment view.
              </p>

              <p>
                If the process completes successfully, the semantic mapping file is also downloaded locally, allowing it
                to be reviewed, reused, or edited later. The resulting RDF output can then be used as the semantically
                enriched representation of the dataset within the project.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="HL7-FHIR" className={`${TutorialStyles.contentContainer} ${TutorialStyles.featureSection}`}      >
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>HL7 FHIR</h2>
            <div className={TutorialStyles.introText}>
              <p>
                The <em>HL7 FHIR</em> view is intended to support the organization of harmonized dataset elements into
                groups that can later be aligned with HL7 FHIR resources. It works as a preparation space where elements
                can be reviewed, described, and grouped before later standardization steps.
              </p>

              <p className={TutorialStyles.lesserText}>
                <em>Note:</em> This functionality may also be unavailable in limited deployments of the platform.
              </p>

              <PageImage
                imageSrc={fhirViewPng}
                maintainAspectRatio={true}
                alt="HL7 FHIR view showing the element list, detail form, and clustering area"
              />

              <p>
                When first opening this view, you will be prompted to upload a CSV file containing the mapped elements.
                Generating this file from the Integration tab is recommended. The first column is treated as the
                element name, while the following columns are used to infer its type and associated
                values. Numeric and date elements are detected through reserved types such as <code>integer</code>,
                <code>double</code>, and <code>date</code>; all other inputs are treated as categorical values.
              </p>

              <p>
                Once the file is loaded, the elements appear in the list panel on the left. Selecting an element opens
                its detail form in the center panel, where its description, possible values, and interpreted value type
                can be reviewed or edited. Each element must be described before clustering can be created.
              </p>

              <p>
                After all elements have been described, clicking the clustering action generates an initial grouping of
                related elements. These groups are displayed in the panel on the right and are intended to help organize
                the dataset into coherent units for later HL7 FHIR work.
              </p>

              <p>
                In the current interface, clustering is the main supported stage of the HL7 FHIR workflow. The detected
                clusters can be reviewed manually in the UI, and elements may be moved between clusters to refine the
                grouping before later modeling steps are performed.
              </p>

              <p>
                The current page should be considered the entry point for HL7 FHIR preparation rather
                than a complete end-to-end FHIR export workflow, which is still under implementation.
                It helps structure the source data into coherent groups that may later correspond to resource fragments,
                profiles, or implementation-specific mapping units.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tutorial;
