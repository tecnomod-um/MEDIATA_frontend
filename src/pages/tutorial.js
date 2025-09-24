import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
import ScrollSidebar from "../components/Common/ScrollSidebar/scrollSidebar.js";
import TutorialStyles from "./tutorial.module.css";
import Slide from '../components/Common/Slide/slide.js';
import LandingImage from "../components/Landing/LandingImage/landingImage.js";

function Tutorial() {
  const [images, setImages] = useState([]);
  const [DiscoverySlides, setDiscoverySlides] = useState([]);

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

  const DiscoverySteps = [
    'Overall Discovery view.',
    'Feature tables containing statistics.',
    'Graph representations of each feature.',
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
    'Discovery:-individual-features',
    'Discovery:-aggregate-features',
    'Unique-values',
    'Count-entities',
    'Creating-and-Filtering-variables',
    'Unions',
    'Variables/Biological-entities',
    'Guided-Use-case',
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
              <LandingImage
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
              <LandingImage
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
      <div id="Discovery:-individual-features" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Discovery: Individual metrics</h2>
            <span className={TutorialStyles.introText}>
              <em>Discovery</em> is the section where you will be first redirected after accessing a node.
              This section displays all the dataset related statistics, with the first view displaying insights
              related to each feature from the selected datasets individually. Initially you can recognize three areas:
              the feature tables, the graphs and the sidebar. This sidebar is also present in the aggregate view, and holds
              most controls.

              <Slide images={DiscoverySlides} steps={DiscoverySteps} />
              <br />
              <br />
              The view first displays two tables: one for the features detected to be continuous, and another for
              categorical features. Each table displays a row for each feature. The continuous table contains count,
              mean, standard deviation, minimum, maximum, first and third quartiles, median and the number of missing entries. 
              The categorical table contains the count, mode, mode frequency, mode percentage, second mode, second mode frequency,
              second mode percentage and the number of missing entries.
              <br />
              <br />
              Each feature has a graphical representation of its distribution. For continuous features, 
              a histogram is shown, and for categorical features, a bar chart is shown. Either clicking on the
              feature name in the corresponding table or on the graph will select that feature. The graphs can
              expand by double clicking them.



            </span>

          </div>
        </div>
      </div>
      {/* Multiple values */}
      <div id="Multiple-Values" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Multiple values</h2>
            <span className={TutorialStyles.introText}>
              To avoid creating repetitive queries when the general structure of the query is the same,
              but the characteristics of the entities are different, INTUITION allows a user to assign different values to the variables.
              <br />
              <br />
              For example, if we are interested in searching for cis-regulatory modules (CRM) identified in
              two or more tissues of interest, we do not need to repeat the same query for each tissue.
              We can specify different tissues in the "Enter URI values" box of “observed in” property.
              Click on "+" to include values and click on “OK” when all values are listed.
              As BioGateway uses semantic resources to identify entities, the values entered must be
              Uniform Resource Identifiers (URIs) corresponding to these resources. <a href="https://github.com/juan-mulero/cisreg/blob/main/INTUITION_Tutorial.pdf" target="_blank" rel="noopener noreferrer">Here</a> we
              include a table with the main vocabularies used for the proper use of URIs.
              <br />
              <br />
              <i>Which CRMs have been identified in heart (UBERON_0000948) and liver (UBERON_0002107)?</i>
            </span>
            <br />
            <span className={TutorialStyles.introText}>
              We can also add multiple values to the node that acts as the subject of the triple:
            </span>
          </div>
        </div>
      </div>
      {/* Unique values */}
      <div id="Unique-values" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Unique values</h2>
            <span className={TutorialStyles.introText}>
              The output table shows the biological entities that meet the biological selection criteria.
              Since a user can design complex query patterns and has the freedom to choose
              which entities they want to include in the output ("Select output" button), duplicate entities might appear in the result.
              <br />
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

      {/* Count values */}
      <div id="Count-entities" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Count values</h2>
            <span className={TutorialStyles.introText}>
              On the other hand, activating the "Count" button displays the number of entities that fit the search pattern of the query.
              For example, following the example above:
              <i> How many CRMs have been identified in heart and liver?</i>
            </span>
          </div>
        </div>
      </div>
      {/* Creating and Filtering Variables */}
      <div id="Creating-and-Filtering-variables" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Creating and Filtering Variables</h2>
            <span className={TutorialStyles.introText}>
              INTUITION allow a user to create their own selection variables. This functionality is implemented in "Set bindings" button,
              in the "Pattern designer". For example, by subtracting the end and start positions of the CRMs, and adding "1" to this number,
              we obtain the length of the sequences in a new variable. Then, we can filter this new variable in the "Set filters" button.
              <br />
              <br />
              Below we illustrate an example: <i>Which CRMs with a length less than or equal to 500 bp positively regulate the human TOX3 gene?</i>
            </span>

          </div>
        </div>
      </div>
      {/* Unions Section */}
      <div id="Unions" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Union of queries</h2>
            <span className={TutorialStyles.introText}>
              INTUITION also allows a user to construct a new query from queries that address related biological aspects, by merging them. We illustrate this through a use case. For example, we want to retrieve the OMIM entities that contain the string "breast cancer" as a name or synonym (<i>Which OMIM entities contain "breast cancer" in their preferred label or alternative label?</i>). To do that, the steps outlined below need to be followed:
            </span>
          </div>
        </div>
      </div>
      {/* Table of variables */}
      <div id="Variables/Biological-entities" className={TutorialStyles.contentContainer}>
        <h2 className={TutorialStyles.centeredHeading}>Variable/Biological entities</h2>
        <table className={TutorialStyles.variablesTable}>
          <tbody>
            <tr><td>CRM variable</td><td>cis regulatory module (currently only enhancer sequences).</td></tr>
            <tr><td>Gene variable</td><td>genes.</td></tr>
            <tr><td>Protein variable</td><td>proteins.</td></tr>
            <tr><td>OMIM variable</td><td>entities from OMIM ontology (mainly phenotypes).</td></tr>
            <tr><td>Molecular_interaction</td><td>entities from Molecular Interactions ontology (MI).</td></tr>
            <tr><td>crm2gene variable</td><td>relation between CRM and gene.</td></tr>
            <tr><td>gene2phen variable</td><td>relation between gene and phenotype.</td></tr>
            <tr><td>crm2phen variable</td><td>relation between CRM and phenotype.</td></tr>
            <tr><td>crm2tfac variable</td><td>relation between CRM and protein (transcription factor).</td></tr>
            <tr><td>Transcription factor variable</td><td>transcription factors (currently only proteins that interact with CRM).</td></tr>
            <tr><td>reg2targ variable</td><td>regulatory relation between proteins.</td></tr>
            <tr><td>prot2prot</td><td>molecular interaction relation between proteins.</td></tr>
            <tr><td>tfac2gene variable</td><td>relation between gene and protein.</td></tr>
            <tr><td>Database variable</td><td>databases.</td></tr>
            <tr><td>Chromosome variable</td><td>chromosomes.</td></tr>
            <tr><td>Reference_genome variable</td><td>genome assembly.</td></tr>
            <tr><td>TAD variable</td><td>topologically associated domain.</td></tr>
            <tr><td>Cellular_component variable</td><td>cellular components from Gene Ontology (GO).</td></tr>
            <tr><td>prot2cc variable</td><td>relation between protein and its cellular components.</td></tr>
            <tr><td>Molecular_function variable</td><td>molecular functions from GO.</td></tr>
            <tr><td>prot2mf</td><td>relation between protein and its molecular functions.</td></tr>
            <tr><td>Biological_process variable</td><td>biological processes from GO.</td></tr>
            <tr><td>prot2bp variable</td><td>relation between protein and its biological processes.</td></tr>
            <tr><td>Ortho variable</td><td>orthology relation between proteins.</td></tr>
            <tr><td>Root variable</td><td>top hierarchically class of NCBITaxon Ontology.</td></tr>
            <tr><td>Taxonomic_rank variable</td><td>top hierarchically class of NCBITaxon Ontology.</td></tr>
          </tbody>
        </table>
        <p className={TutorialStyles.lesserText}>
          The properties are detailed with examples and their domains <a href="https://github.com/juan-mulero/cisreg/blob/main/BGW_graphs.xlsx" target="_blank" rel="noopener noreferrer">here</a>.
        </p>
      </div>

      {/* Guided use case */}
      <div id="Guided-Use-case" className={TutorialStyles.contentContainer}>
        <div className={TutorialStyles.textImageContainer}>
          <div className={TutorialStyles.textContainer}>
            <h2 className={TutorialStyles.centeredHeading}>Guided Use Case</h2>
            <span className={TutorialStyles.introText}>
              A guided step-by-step guide to building Use Case 1.1 is shown below: <i>Is the rs4784227 mutation (chr16:52565276) located in any enhancer sequence linked to target genes in the network? What databases support the sequence and what are their target genes? Is the enhancer related to any disease? Which proteins are encoded by the genes?</i>
            </span>
          </div>
        </div>
      </div>

    </div >
  );
}

export default Tutorial;
